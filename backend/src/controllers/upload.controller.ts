import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import FormData from "form-data";
import { getClient } from "../database/db";
import {
  validateUploadedFile,
  getFileInfo,
  getFileType,
  deleteUploadedFile,
} from "../middleware/upload.middleware";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { OpenAIParserService } from "../services/openai-parser.service";
import {
  calculateExperienceFromWorkHistory,
  extractExperienceFromText,
  getBestExperience,
} from "../services/experience.service";
import { calculateTotalExperience } from "../utils/experienceCalculator";
import { checkDuplicateBeforeInsert } from "../services/duplicate.service";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — used to store ALL parsed sections inline (no-Redis mode)
// ─────────────────────────────────────────────────────────────────────────────

function parseDateStr(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (["present", "current", "now", "till date"].includes(lower)) return null;

  // Month Year e.g. "Jan 2020"
  const mY = s.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})$/i);
  if (mY) {
    const map: Record<string, string> = {
      jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
      jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
    };
    return `${mY[2]}-${map[mY[1].toLowerCase().slice(0,3)]}-01`;
  }
  const yOnly = s.match(/^(\d{4})$/);
  if (yOnly) { const y = parseInt(yOnly[1]); if (y>=1900&&y<=2100) return `${y}-01-01`; }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    if (y >= 1900 && y <= 2100) return d.toISOString().split("T")[0];
  }
  return null;
}

function safeDate(raw: any): string | null {
  const d = parseDateStr(raw);
  if (!d) return null;
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [,yr,mo,dy] = m.map(Number);
  if (yr<1900||yr>2100||mo<1||mo>12||dy<1||dy>31) return null;
  return d;
}

function trunc(s: string | null | undefined, max = 255): string | null {
  if (!s) return null;
  return s.length <= max ? s : s.substring(0, max - 3) + "...";
}

/**
 * Parse a grade/GPA value from the AI parser to a numeric float suitable for
 * the DOUBLE PRECISION `gpa` DB column. Handles all formats returned by
 * _normalize_gpa() in deberta_ner_parser.py:
 *   "3.8/4.0"  → 3.8     (take numerator)
 *   "8.5/10"   → 8.5     (take numerator)
 *   "3.8"      → 3.8     (plain number)
 *   85         → 85      (already numeric from OpenAI gpa field)
 *   null/""    → null
 */
function parseGrade(raw: any): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return isFinite(raw) ? raw : null;
  }
  const s = String(raw).trim();
  if (!s) return null;
  // Handle "X/Y" format — take only the numerator
  const slashMatch = s.match(/^(\d+\.?\d*)\s*\/\s*\d+\.?\d*$/);
  if (slashMatch) {
    const n = parseFloat(slashMatch[1]);
    return isFinite(n) ? n : null;
  }
  // Handle plain number "3.8", "85", "8.5"
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

// Stores ALL sections from the AI response into PostgreSQL
async function storeAllParsedData(client: any, candidateId: string, ai: any, filePath?: string) {
  // ── 1. UPDATE candidates table ────────────────────────────────────────────
  const emailHash = ai.email
    ? crypto.createHash("md5").update(ai.email.trim().toLowerCase()).digest("hex")
    : null;

  let resumeHash: string | null = null;
  if (filePath && fs.existsSync(filePath)) {
    try { resumeHash = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"); }
    catch { /* ignore hash errors */ }
  }

  const location =
    ai.location ||
    (Array.isArray(ai.locations) && ai.locations.length > 0 ? ai.locations[0] : null);

  const qualityScore = ai.extraction_quality?.extraction_quality_percentage
    ? Math.round(ai.extraction_quality.extraction_quality_percentage) : null;
  const confidenceScore = ai.confidence?.overall ?? null;

  await client.query(
    `UPDATE candidates
     SET full_name            = COALESCE($1,  full_name),
         email                = COALESCE($2,  email),
         phone                = COALESCE($3,  phone),
         location             = COALESCE($4,  location),
         linkedin_url         = COALESCE($5,  linkedin_url),
         github_url           = COALESCE($6,  github_url),
         portfolio_url        = COALESCE($7,  portfolio_url),
         summary              = COALESCE($8,  summary),
         status               = 'success',
         review_status        = 'pending',
         email_hash           = COALESCE($9,  email_hash),
         resume_hash          = COALESCE($10, resume_hash),
         raw_resume_text      = COALESCE($11, raw_resume_text),
         domain               = COALESCE($12, domain),
         domain_confidence    = COALESCE($13, domain_confidence),
         licenses             = COALESCE($14, licenses),
         updated_at           = NOW()
     WHERE id = $15`,
    [
      trunc(ai.name),
      trunc(ai.email),
      trunc(ai.phone, 50),
      trunc(location),
      trunc(ai.linkedin, 500),
      trunc(ai.github, 500),
      trunc(ai.portfolio_url || ai.portfolio || ai.website || ai.personal_website, 500),
      trunc(ai.summary, 2000),
      emailHash,
      resumeHash,
      ai.raw_text || ai.raw_resume_text || null,
      ai.domain?.primary_domain || null,
      ai.domain?.confidence || null,
      JSON.stringify(ai.licenses || []),
      candidateId,
    ]
  );
  console.log(`  ✅ Candidate profile updated`);

  // ── 2. WORK HISTORY ───────────────────────────────────────────────────────
  // Accept both field names the AI may return
  const workItems: any[] =
    (Array.isArray(ai.work_history) && ai.work_history.length > 0 ? ai.work_history : null) ??
    (Array.isArray(ai.work_history)   && ai.work_history.length   > 0 ? ai.work_history   : null) ??
    [];

  await client.query("DELETE FROM work_history WHERE candidate_id = $1", [candidateId]);
  
  const { total, processed } = calculateTotalExperience(workItems);

  for (const w of processed) {
    await client.query(
      `INSERT INTO work_history
         (id, candidate_id, job_title, company_name, start_date, end_date, is_current, description, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        uuidv4(),
        candidateId,
        trunc(w.job_title || w.title, 200),
        trunc(w.company_name || w.company, 200),
        w.parsed_start ? w.parsed_start.toISOString().split('T')[0] : safeDate(w.start_date),
        w.parsed_end ? w.parsed_end.toISOString().split('T')[0] : safeDate(w.is_current ? null : w.end_date),
        w.is_current || false,
        trunc(w.description || (Array.isArray(w.responsibilities) ? w.responsibilities.join("; ") : null), 2000),
        trunc(w.location, 200),
      ]
    );
  }
  console.log(`  ✅ Work history: ${workItems.length} entries stored`);

  // ── 2b. SAVE TOTAL EXPERIENCE ───────────────────────────────────────
  if (total.total_records > 0) {
    try {
      const bestExpFloat = total.years + (total.months / 12);
      await client.query(
        `UPDATE candidates SET total_experience_years = $1, total_years_exp = $2 WHERE id = $3`,
        [bestExpFloat, JSON.stringify(total), candidateId]
      );
      console.log(`  ✅ Experience: ${total.formatted_string}`);
    } catch (expErr: any) {
      console.warn(`  ⚠️  Could not update total_experience_years: ${expErr.message}`);
    }
  }

  // ── 3. EDUCATION ──────────────────────────────────────────────────────────
  const eduItems: any[] = Array.isArray(ai.education) ? ai.education : [];
  await client.query("DELETE FROM education WHERE candidate_id = $1", [candidateId]);
  for (const e of eduItems) {
    await client.query(
      `INSERT INTO education (id, candidate_id, degree, institution, field_of_study, start_date, end_date, gpa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uuidv4(),
        candidateId,
        trunc(e.degree || e.degree_name),
        trunc(e.institution || e.institution_name || e.school),
        trunc(e.field_of_study || e.major),
        safeDate(e.start_year || e.start_date),
        safeDate(e.end_year   || e.end_date || e.graduation_date),
        parseGrade(e.grade ?? e.gpa ?? null),  // DeBERTa outputs 'grade'; OpenAI/legacy outputs 'gpa'
      ]
    );
  }
  console.log(`  ✅ Education: ${eduItems.length} entries stored`);

  // ── 4. SKILLS + CANDIDATE_SKILLS ──────────────────────────────────────────
  const rawSkills: any[] = Array.isArray(ai.skills) ? ai.skills : [];
  await client.query("DELETE FROM candidate_skills WHERE candidate_id = $1", [candidateId]);
  for (const sk of rawSkills) {
    const skillName = typeof sk === "string" ? sk.trim() : (sk.name || sk.skill_name || "").trim();
    if (!skillName) continue;
    const nameTrimmed = trunc(skillName)!;

    // Find or create the skill row for this candidate
    const existing = await client.query("SELECT id FROM skills WHERE name = $1 AND candidate_id = $2", [nameTrimmed, candidateId]);
    let skillId: string;
    if (existing.rows.length > 0) {
      skillId = existing.rows[0].id;
    } else {
      const ins = await client.query(
        "INSERT INTO skills (id, candidate_id, name, skill_name, category) VALUES ($1,$2,$3,$4,'technical') RETURNING id",
        [uuidv4(), candidateId, nameTrimmed, nameTrimmed]
      );
      skillId = ins.rows[0].id;
    }

    await client.query(
      `INSERT INTO candidate_skills (candidate_id, skill_id, proficiency_level)
       VALUES ($1,$2,'intermediate') ON CONFLICT DO NOTHING`,
      [candidateId, skillId]
    );
  }
  console.log(`  ✅ Skills: ${rawSkills.length} entries stored`);

  // ── 5. CERTIFICATIONS ─────────────────────────────────────────────────────
  const certs: any[] = Array.isArray(ai.certifications) ? ai.certifications : [];
  if (certs.length > 0) {
    try {
      await client.query("DELETE FROM certifications WHERE candidate_id = $1", [candidateId]);
      for (const c of certs) {
        const name = (typeof c === "string" ? c : (c.name || "")).trim();
        if (!name) continue;
        await client.query(
          `INSERT INTO certifications (id, candidate_id, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [uuidv4(), candidateId, trunc(name)]
        );
      }
      console.log(`  ✅ Certifications: ${certs.length} entries stored`);
    } catch (e: any) {
      console.warn(`  ⚠️  Certifications skipped: ${e.message}`);
    }
  }

  // ── 6. PROJECTS (stored as JSONB on candidate row) ────────────────────────
  const projects: any[] = Array.isArray(ai.projects) ? ai.projects : [];
  if (projects.length > 0) {
    try {
      await client.query("UPDATE candidates SET projects = $1 WHERE id = $2",
        [JSON.stringify(projects), candidateId]);
      console.log(`  ✅ Projects: ${projects.length} entries stored`);
    } catch { /* column may not exist in older migrations */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main upload handler
// ─────────────────────────────────────────────────────────────────────────────
export const uploadResume = async (
  req: Request,
  res: Response,
): Promise<void> => {
  let client: any = null;

  try {
    // 1. Validate file
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded", message: "Please upload a resume file", code: "NO_FILE_UPLOADED" });
      return;
    }
    validateUploadedFile(req.file);

    const fileInfo    = getFileInfo(req.file);
    const userId      = (req as any).user?.id;
    const llmProvider = req.body.llm_provider || "";
    const forceOcr    = req.body.force_ocr === "true" || req.body.force_ocr === true;

    console.log(`📄 Resume upload: ${fileInfo.originalname} (${fileInfo.type})`);

    // ── 1.4. Detect if file is an image ─────────────────────────────────────────────
    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileInfo.type);
    console.log(`  🖼️  Is image: ${isImage}`);

    // ── 1.5. Extract Text IMMEDIATELY ─────────────────────────────────────────────
    let rawResumeText = "";
    try {
      console.log(`  📄 Extracting text via /preview-sections before DB insert...`);
      const AI_URL = process.env.AI_SERVICE_URL;
      const formData = new FormData();
      formData.append("file", fs.createReadStream(path.resolve(fileInfo.path)));
      formData.append("force_ocr", String(forceOcr));
      formData.append("is_image", String(isImage));

      const previewRes = await axios.post(`${AI_URL}/preview-sections`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      
      if (previewRes.status === 200) {
        const previewData = previewRes.data;
        const extracted = previewData.raw_text || previewData.text || previewData.raw_resume_text || "";
        rawResumeText = extracted.trim();
      }
    } catch (err) {
      console.warn(`  ⚠️ Failed to extract text beforehand: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!rawResumeText) {
       console.log("  ⚠️ raw_resume_text is empty after initial extraction!");
    } else {
       console.log(`  ✅ Extracted raw text (length: ${rawResumeText.length})`);
    }

    // 2. DB transaction: create candidate + parsing_job
    client = await getClient();
    await client.query("BEGIN");

    const candidateId = uuidv4();
    const tenantId    = (req as any).user?.tenant_id || "default";

    // ── DUPLICATE CHECK ── before creating the candidate
    // We won't have name/email/phone yet at this early stage (before AI parse),
    // so duplicate check runs AFTER the AI parse in the direct parse path below.
    // The early candidate row is created as 'pending' and removed if duplicate.

    const cRes = await client.query(
      `INSERT INTO candidates (id, status, review_status, tenant_id, consent_given, raw_resume_text, created_by_user_id, resume_file_path, original_filename, created_at, updated_at)
       VALUES ($1,'pending','pending',$2,false,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`,
      [candidateId, tenantId, rawResumeText || null, userId, fileInfo.path, fileInfo.originalname]
    );
    const candidate = cRes.rows[0];
    console.log(`  ✅ Candidate created: ${candidate.id}`);

    const parsingJobId = uuidv4();
    const pjRes = await client.query(
      `INSERT INTO parsing_jobs (id, candidate_id, filename, file_path, status, raw_text, started_at)
       VALUES ($1,$2,$3,$4,'pending',$5,NOW()) RETURNING *`,
      [parsingJobId, candidate.id, fileInfo.originalname, fileInfo.path, rawResumeText || null]
    );
    const parsingJob = pjRes.rows[0];
    console.log(`  ✅ Parsing job created: ${parsingJob.id}`);

    // Log activity
    await client.query(
      `INSERT INTO activity_log (action, entity_id, entity_type, user_id, created_at, details)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      ['candidate_sourced', candidate.id, 'candidate', userId, JSON.stringify({
        filename: fileInfo.originalname,
        method: 'resume_upload'
      })]
    );

    // Log audit
    await client.query(
      `INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, created_at, details)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [uuidv4(), 'create', 'candidates', candidate.id, userId, JSON.stringify({
        filename: fileInfo.originalname,
        method: 'resume_upload'
      })]
    );

    // ── DIRECT PARSE PATH: call AI service inline ──────────────────────────
    await client.query("COMMIT"); // commit DB records before slow AI call

    const directClient = await getClient();
    try {
      // Mark as processing
      await directClient.query(
        `UPDATE parsing_jobs SET status = 'processing' WHERE id = $1`,
        [parsingJobId]
      );

        // Call the Python AI service
        const AI_URL = process.env.AI_SERVICE_URL;
        console.log(`  🤖 Calling AI service: ${AI_URL}/parse`);

        const aiRes = await fetch(`${AI_URL}/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_path: fileInfo.path,
            candidate_id: candidateId,
            ...(llmProvider ? { llm_provider: llmProvider } : {}),
            force_ocr: forceOcr,
          }),
        });

        if (!aiRes.ok) {
          throw new Error(`AI service error ${aiRes.status}: ${await aiRes.text()}`);
        }

        const aiData: any = await aiRes.json();
        console.log(`  🤖 AI responded with status: ${aiData.status}`);

        if (aiData.status !== "success") {
          throw new Error(`AI returned status="${aiData.status}": ${aiData.error || "unknown"}`);
        }

        // Extract raw text from file if not provided by AI service
        console.log(`  🔍 DEBUG: aiData.raw_text type: typeof ${typeof aiData.raw_text}, value length: ${aiData.raw_text ? aiData.raw_text.length : 'null'}`);
        console.log(`  🔍 DEBUG: aiData.raw_resume_text type: typeof ${typeof aiData.raw_resume_text}, value length: ${aiData.raw_resume_text ? aiData.raw_resume_text.length : 'null'}`);
        let rawText = aiData.raw_text || aiData.raw_resume_text || rawResumeText;
        console.log(`  🔍 AI response raw_text present: ${!!aiData.raw_text}, raw_resume_text present: ${!!aiData.raw_resume_text}, fallback used: ${!aiData.raw_text && !aiData.raw_resume_text}`);
        
        // Add raw text to aiData for storage
        if (rawText) {
          aiData.raw_text = rawText;
          console.log(`  ✅ Raw text added to aiData (length: ${rawText.length})`);
        } else {
          console.log(`  ⚠️ No raw text available to store`);
        }

        // Store ALL sections into the database
        console.log(`📥 Storing parsed data for candidate ${candidateId}...`);

        // ── DUPLICATE CHECK after AI extraction (we have name/email/phone now) ──
        const forceSave = req.body.forceSave === 'true' || req.body.forceSave === true;
        
        let dupCheck = null;
        if (!forceSave) {
          dupCheck = await checkDuplicateBeforeInsert(directClient, {
            email: aiData.email || null,
            phone: aiData.phone || null,
            full_name: aiData.name || null,
            linkedin_url: aiData.linkedin_url || null,
            tenant_id: tenantId,
          });
        }
        if (dupCheck && dupCheck.isDuplicate) {
          // Clean up the pending candidate we just created
          await directClient.query(
            `DELETE FROM candidates WHERE id = $1 AND status = 'pending'`,
            [candidateId]
          );
          if (req.file) deleteUploadedFile(req.file.path);
          console.log(`⚠️  Duplicate detected: ${dupCheck.message}`);
          res.status(409).json({
            error: "Duplicate candidate",
            message: dupCheck.message,
            code: "DUPLICATE_CANDIDATE",
            field: dupCheck.field,
            existingCandidateId: dupCheck.existingCandidateId,
            existingCandidateName: dupCheck.existingCandidateName,
          });
          return;
        }

        await storeAllParsedData(directClient, candidateId, aiData, fileInfo.path);

        // Mark parsing_job as completed
        await directClient.query(
          `UPDATE parsing_jobs
           SET status = 'completed',
               confidence_score = $1,
               parsed_data = $2,
               raw_text = $3,
               completed_at = NOW()
           WHERE id = $4`,
          [aiData.confidence?.overall ?? null, JSON.stringify(aiData), aiData.raw_text || aiData.raw_resume_text || null, parsingJobId]
        );

        const workCount = (
          (Array.isArray(aiData.work_history) ? aiData.work_history : []).length ||
          (Array.isArray(aiData.work_history)   ? aiData.work_history   : []).length
        );

        console.log(`✅ Direct parse complete — candidate ${candidateId}`);
        res.status(201).json({
          success: true,
          message: "Resume uploaded and parsed successfully",
          warning: dupCheck?.warning || undefined,
          data: {
            candidateId: candidate.id,
            parsingJobId: parsingJob.id,
            status: "completed",
            parsed: {
              name:                  aiData.name  || null,
              email:                 aiData.email || null,
              phone:                 aiData.phone || null,
              skills_count:          (aiData.skills         || []).length,
              work_history_count:    workCount,
              education_count:       (aiData.education      || []).length,
              certifications_count:  (aiData.certifications || []).length,
            },
            fileInfo: { originalName: fileInfo.originalname, size: fileInfo.size, type: fileInfo.type },
          },
        });

      } catch (parseErr: any) {
        const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error(`❌ Direct parse failed for candidate ${candidateId}:`, errMsg);
        await directClient.query(
          `UPDATE parsing_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
          [errMsg, parsingJobId]
        );
        await directClient.query(
          `UPDATE candidates SET status = 'failed' WHERE id = $1`,
          [candidateId]
        );
        res.status(500).json({
          error: "Parse failed",
          message: errMsg,
          code: "PARSE_FAILED",
          candidateId: candidate.id,
        });
      } finally {
        directClient.release();
      }
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (e) {}
    }
    if (req.file) deleteUploadedFile(req.file.path);
    console.error("❌ Upload error:", error);
    console.error("❌ Full error stack:", error instanceof Error ? error.stack : String(error));

    if (error instanceof Error) {
      if (error.message.includes("Invalid file type")) {
        res.status(400).json({ error: "Invalid file type", message: error.message, code: "INVALID_FILE_TYPE", allowedTypes: ["PDF","DOCX","TXT"] });
        return;
      }
      if (error.message.includes("File size exceeds")) {
        res.status(400).json({ error: "File too large", message: error.message, code: "FILE_TOO_LARGE" });
        return;
      }
    }
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && error instanceof Error) {
      res.status(500).json({ 
        error: "Upload failed", 
        message: "An unexpected error occurred", 
        code: "UPLOAD_FAILED",
        details: error.message,
        stack: error.stack
      });
    } else {
      res.status(500).json({ error: "Upload failed", message: "An unexpected error occurred", code: "UPLOAD_FAILED" });
    }
  } finally {
    if (client) client.release();
  }
};

// Get upload status and configuration
export const getUploadConfig = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE_MB || "10");
    const uploadPath = process.env.FILE_UPLOAD_PATH || "./uploads";

    res.json({
      config: {
        maxFileSizeMB: maxFileSize,
        maxFileSizeBytes: maxFileSize * 1024 * 1024,
        allowedTypes: ["PDF", "DOCX", "TXT"],
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
        uploadPath,
        fieldName: "resume",
      },
      instructions: {
        method: "POST",
        endpoint: "/api/upload/resume",
        contentType: "multipart/form-data",
        fieldName: "resume",
        authentication: "Bearer token required",
      },
    });
  } catch (error) {
    console.error("❌ Error getting upload config:", error);
    res.status(500).json({
      error: "Failed to get upload configuration",
      message: "Please try again later",
    });
  }
};

// Get upload statistics (admin only)
export const getUploadStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const client = await getClient();

    try {
      // Get total candidates count
      const totalCandidatesResult = await client.query(
        "SELECT COUNT(*) FROM candidates",
      );
      const totalCandidates = parseInt(totalCandidatesResult.rows[0].count);

      // Get candidates with files
      const withFiles = totalCandidates; // Assume all candidates have data

      // Get parsing jobs statistics
      const parsingStatsResult = await client.query(`
        SELECT status, COUNT(*) as count 
        FROM parsing_jobs 
        GROUP BY status
      `);

      const parsingStats = parsingStatsResult.rows.reduce(
        (acc: any, row: any) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        },
        {},
      );

      // Get file type statistics
      const fileTypeStatsResult = await client.query(`
        SELECT file_type, COUNT(*) as count 
        FROM candidates 
        WHERE file_type IS NOT NULL 
        GROUP BY file_type
      `);

      const fileTypeStats = fileTypeStatsResult.rows.reduce(
        (acc: any, row: any) => {
          acc[row.file_type] = parseInt(row.count);
          return acc;
        },
        {},
      );

      res.json({
        statistics: {
          totalCandidates,
          candidatesWithFiles: withFiles,
          candidatesWithoutFiles: totalCandidates - withFiles,
          parsingJobs: {
            queued: parsingStats.queued || 0,
            processing: parsingStats.processing || 0,
            completed: parsingStats.completed || 0,
            failed: parsingStats.failed || 0,
            total: Object.values(parsingStats).reduce(
              (sum: number, count: any) => sum + parseInt(count.toString()),
              0,
            ),
          },
          fileTypes: fileTypeStats,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error getting upload stats:", error);
    res.status(500).json({
      error: "Failed to get upload statistics",
      message: "Please try again later",
    });
  }
};

/**
 * Preview resume sections without running DeBERTa entity extraction
 * Forwards file to Python AI service's /preview-sections endpoint
 */
export const previewSections = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Validate file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: "No file uploaded",
        message: "Please upload a resume file",
        code: "NO_FILE_UPLOADED",
      });
      return;
    }

    const fileInfo = getFileInfo(req.file);
    const forceOcr = req.body.force_ocr === 'true' || req.body.force_ocr === true || req.body.forceOcr === 'true' || req.body.forceOcr === true;
    
    console.log(`🔍 Preview sections endpoint called for file: ${fileInfo.originalname} (forceOcr: ${forceOcr})`);
 
    // 2. Create FormData to forward to Python service
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path), {
      filename: fileInfo.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("force_ocr", forceOcr ? "true" : "false");
 
    // 3. Forward to Python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    const endpoint = `${aiServiceUrl}/preview-sections`;

    console.log(`📤 Forwarding to Python AI service: ${endpoint}`);

    const response = await axios.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 120000, // 120 second timeout
    });

    console.log(`✅ Preview sections completed for: ${fileInfo.originalname}`);

    // 4. Clean up uploaded file
    try {
      deleteUploadedFile(req.file.path);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to delete temporary file: ${req.file.path}`);
    }

    // 5. Return response from Python service
    res.status(200).json(response.data);

  } catch (error: any) {
    console.error("❌ Error in preview sections:", error.message);

    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        deleteUploadedFile(req.file.path);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to delete temporary file: ${req.file.path}`);
      }
    }

    // Handle specific error cases
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      res.status(503).json({
        error: "AI service unavailable",
        message: "The Python AI service is currently unreachable. Please try again later.",
        code: "AI_SERVICE_UNAVAILABLE",
      });
      return;
    }

    if (error.response) {
      // Python service returned an error
      res.status(error.response.status).json({
        error: "Preview sections failed",
        message: error.response.data?.detail || error.response.data?.message || "Failed to preview sections",
        code: "PREVIEW_FAILED",
      });
      return;
    }

    // Generic error
    res.status(500).json({
      error: "Preview sections failed",
      message: "An unexpected error occurred while previewing sections",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Parse resume sections using selected AI model (DeBERTa or OpenAI)
 * Supports model selection via request body parameter
 */
export const parseSections = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { model, experience_text, education_text } = req.body;
    const selectedModel = model || "own-model";

    console.log(`🎯 Selected Model: ${selectedModel}`);

    // If model is gpt-4o-mini, use OpenAI parser for experience/education + existing parser for rest
    if (selectedModel === "gpt-4o-mini") {
      try {
        console.log("🤖 Using Hybrid Parser: OpenAI for Experience/Education + Existing for Skills/Contact/Summary");

        const experienceText = experience_text || "";
        const educationText = education_text || "";

        if (!experienceText && !educationText) {
          res.status(400).json({
            error: "Missing sections",
            message: "Experience or education section text is required",
            code: "MISSING_SECTIONS",
          });
          return;
        }

        // Step A: Use OpenAI for work experience and education
        console.log("📤 Step A: Calling OpenAI for experience and education...");
        const openaiService = new OpenAIParserService();
        const openaiResult = await openaiService.parseResumeSections(
          experienceText,
          educationText
        );

        console.log(`✅ OpenAI Response Received`);
        console.log(`📊 Extracted ${openaiResult.work_history.length} work experiences`);
        console.log(`🎓 Extracted ${openaiResult.education.length} education entries`);

        // Step B: Use existing parser for skills, contact, summary, certifications, projects
        console.log("📤 Step B: Calling existing parser for skills, contact, summary, certifications, projects...");
        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
        const endpoint = `${aiServiceUrl}/parse-sections`;

        const existingResponse = await axios.post(endpoint, req.body, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000,
        });

        const existingResult = existingResponse.data;
        console.log(`✅ Existing parser response received`);

        // Step C: Merge results
        console.log("🔀 Step C: Merging OpenAI and existing parser results...");
        const mergedResult = {
          status: "success",
          work_history: openaiResult.work_history,
          education: openaiResult.education,
          skills: existingResult.skills || [],
          summary: existingResult.summary || "",
          certifications: existingResult.certifications || [],
          projects: existingResult.projects || [],
          contact: existingResult.contact || {},
          processing_time_ms: openaiResult.processing_time_ms,
          message: `Successfully parsed with OpenAI (experience/education) + Existing parser (skills/contact/summary): ${openaiResult.work_history.length} experience entries, ${openaiResult.education.length} education entries, ${existingResult.skills?.length || 0} skills`,
          metadata: {
            model: "gpt-4o-mini-hybrid",
            openai_token_usage: openaiResult.token_usage,
            openai_processing_time_ms: openaiResult.processing_time_ms,
            existing_processing_time_ms: existingResult.processing_time_ms,
          },
        };

        console.log(`✅ Hybrid parsing completed successfully`);
        res.status(200).json(mergedResult);
        return;

      } catch (openaiError: any) {
        console.error("❌ Hybrid parsing failed, falling back to full DeBERTa:", openaiError.message);
        console.log("🔄 Attempting fallback to DeBERTa parser...");
        // Fall through to DeBERTa parser below
      }
    }

    // Default: Use DeBERTa NER parser (own-model) or fallback
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    const endpoint = `${aiServiceUrl}/parse-sections`;

    console.log(`📤 Forwarding parse-sections request to Python AI service: ${endpoint}`);

    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 300000, // 5 minute timeout for heavy NER models
    });

    console.log(`✅ Parse sections completed successfully (DeBERTa)`);
    res.status(200).json(response.data);

  } catch (error: any) {
    console.error("❌ Error in parse sections:", error.message);

    // Handle specific error cases
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
      res.status(504).json({
        error: "AI service timeout or unavailable",
        message: "The AI service took too long to respond or is unreachable. The resume might be too large or the AI server is busy.",
        code: "AI_SERVICE_TIMEOUT",
      });
      return;
    }

    if (error.response) {
      res.status(error.response.status).json({
        error: "Parse sections failed",
        message: error.response.data?.detail || error.response.data?.message || "Failed to parse sections",
        code: "PARSE_FAILED",
      });
      return;
    }

    res.status(500).json({
      error: "Parse sections failed",
      message: "An unexpected error occurred while parsing sections",
      code: "INTERNAL_ERROR",
    });
  }
};

