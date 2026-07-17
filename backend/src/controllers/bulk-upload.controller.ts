import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { getClient } from "../database/db";
import path from "path";
import { PerformanceTimer, timeAsync } from "../utils/timing";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
const BULK_MAX_FILES = parseInt(process.env.BULK_UPLOAD_MAX_FILES || "100", 10);

// Schema caches
interface CandidatesSchemaInfo {
  hasResumeFilePath: boolean;
  hasOriginalFilename: boolean;
  hasFilePath: boolean;
  hasCreatedByUserId: boolean;
}
let candidatesSchemaCache: CandidatesSchemaInfo | null = null;

async function getCandidatesSchemaInfo(client: any): Promise<CandidatesSchemaInfo> {
  if (candidatesSchemaCache) return candidatesSchemaCache;
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'candidates' AND table_schema = 'public'`
  );
  const columns = new Set(result.rows.map((row: any) => row.column_name));
  candidatesSchemaCache = {
    hasResumeFilePath: columns.has('resume_file_path'),
    hasOriginalFilename: columns.has('original_filename'),
    hasFilePath: columns.has('file_path'),
    hasCreatedByUserId: columns.has('created_by_user_id'),
  };
  return candidatesSchemaCache;
}

function normalizeFileType(mimetype: string): string {
  const lower = (mimetype || '').toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('word') || lower.includes('officedocument') || lower.endsWith('docx') || lower.endsWith('doc')) return 'docx';
  if (lower.includes('text') || lower.includes('plain')) return 'txt';
  if (lower.startsWith('image/')) return 'image';
  return 'pdf';
}

interface SkillsSchemaInfo {
  hasNormalizedName: boolean;
  candidateIdNullable: boolean;
  hasSkillName: boolean;
}
let skillsSchemaCache: SkillsSchemaInfo | null = null;

async function getSkillsSchemaInfo(client: any): Promise<SkillsSchemaInfo> {
  if (skillsSchemaCache) return skillsSchemaCache;
  const result = await client.query(
    `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'skills' AND table_schema = 'public'`
  );
  const columns = new Map<string, boolean>();
  for (const row of result.rows) {
    columns.set(row.column_name, row.is_nullable === 'YES');
  }
  skillsSchemaCache = {
    hasNormalizedName: columns.has('normalized_name'),
    candidateIdNullable: columns.get('candidate_id') ?? true,
    hasSkillName: columns.has('skill_name'),
  };
  return skillsSchemaCache;
}

interface BulkFileRequest {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

interface ParsedResume {
  file: BulkFileRequest;
  candidateId: string;
  parsingJobId: string;
  parsed: any;
  rawText: string;
  sections: Record<string, any>;
  duplicate?: { isDuplicate: boolean; message: string; field: string; existingCandidateId?: string; existingCandidateName?: string | null };
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk upload handler — single batch AI call + batched DB save
// ─────────────────────────────────────────────────────────────────────────────
export const bulkUploadResumes = async (
  req: Request,
  res: Response
): Promise<void> => {
  const timer = new PerformanceTimer("bulk-upload");
  const files = (req.files as Express.Multer.File[]) || [];

  if (!files.length) {
    res.status(400).json({ error: "No files uploaded", code: "NO_FILES_UPLOADED" });
    return;
  }

  if (files.length > BULK_MAX_FILES) {
    res.status(400).json({
      error: `Maximum ${BULK_MAX_FILES} files allowed per bulk upload`,
      code: "BULK_LIMIT_EXCEEDED",
    });
    return;
  }

  const userId = (req as any).user?.id;
  const tenantId = (req as any).user?.tenant_id || "default";
  const model = req.body.model || "own-model";
  const forceOcr = req.body.force_ocr === "true" || req.body.force_ocr === true;

  console.log(`📦 Bulk upload started: ${files.length} files, model=${model}`);
  timer.step("validation");

  // Single batch call to AI service: extracts text and parses all resumes with controlled concurrency
  const parseResults = await parseBatchWithAi(files, model, forceOcr, timer);

  timer.step("ai-parse-batch");

  // Save all results in a single batched DB transaction
  const savedResults = await saveCandidatesBatch(
    parseResults.filter((r): r is ParsedResume => !r.error),
    userId,
    tenantId,
    timer
  );

  timer.step("database-save");

  const summary = buildSummary(savedResults);
  timer.end();
  timer.log();

  res.status(201).json({
    success: true,
    message: `Bulk upload processed: ${summary.successful} saved, ${summary.duplicates} duplicates, ${summary.failed} failed`,
    summary,
    results: savedResults.map((r) => ({
      fileName: r.file.originalname,
      candidateId: r.candidateId,
      status: r.error ? "failed" : r.duplicate?.isDuplicate ? "duplicate" : "success",
      error: r.error,
      duplicate: r.duplicate,
    })),
  });
};

async function parseBatchWithAi(
  files: BulkFileRequest[],
  model: string,
  forceOcr: boolean,
  parentTimer: PerformanceTimer
): Promise<ParsedResume[]> {
  const t = new PerformanceTimer("ai-parse-batch");
  const AI_URL = process.env.AI_SERVICE_URL;

  // Map frontend model values to AI service llm_provider. "own-model" uses built-in DeBERTa.
  const llmProvider = model && model !== "own-model" ? model : null;

  const fileMapping = files.map((file) => ({
    file,
    candidateId: uuidv4(),
    parsingJobId: uuidv4(),
  }));

  const payload = {
    files: fileMapping.map((m) => ({ file_path: path.resolve(m.file.path), candidate_id: m.candidateId })),
    llm_provider: llmProvider,
    force_ocr: forceOcr,
  };

  try {
    const { result, durationMs } = await timeAsync(
      "parse-batch",
      () =>
        axios.post(`${AI_URL}/parse-batch`, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 600000, // 10 minutes for large batches
        })
    );

    const batchResponse = result.data;
    const resultsByPath = new Map<string, any>();
    for (const r of batchResponse.results || []) {
      resultsByPath.set(r.candidate_id, r);
    }

    t.step("ai-batch-response");
    t.end();
    parentTimer.step(`ai-batch:${files.length}:${durationMs.toFixed(0)}ms`);

    return fileMapping.map(({ file, candidateId, parsingJobId }) => {
      const ai = resultsByPath.get(candidateId);

      if (!ai || ai.status === "error") {
        return {
          file,
          candidateId,
          parsingJobId,
          parsed: {},
          rawText: "",
          sections: {},
          error: ai?.error || "AI batch parse failed",
        };
      }

      const parsed = {
        contact: {
          name: ai.name || null,
          email: ai.email || null,
          phone: ai.phone || null,
          linkedin: ai.linkedin || null,
          github: ai.github || null,
        },
        name: ai.name || null,
        email: ai.email || null,
        phone: ai.phone || null,
        linkedin: ai.linkedin || null,
        github: ai.github || null,
        skills: ai.skills || [],
        work_history: ai.work_history || ai.work_experience || [],
        work_experience: ai.work_experience || ai.work_history || [],
        education: ai.education || [],
        certifications: ai.licenses || [], // ParseResponse uses licenses for certifications
        projects: ai.projects || [],
        summary: ai.summary || null,
        years_of_experience: ai.years_of_experience || null,
        confidence: ai.confidence || {},
        processing_metrics: ai.processing_metrics || {},
      };

      return {
        file,
        candidateId,
        parsingJobId,
        parsed,
        rawText: ai.raw_text || ai.raw_resume_text || "",
        sections: {},
      };
    });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Batch AI parse failed:", msg);
    return fileMapping.map(({ file, candidateId, parsingJobId }) => ({
      file,
      candidateId,
      parsingJobId,
      parsed: {},
      rawText: "",
      sections: {},
      error: msg,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database helpers — batched inserts
// ─────────────────────────────────────────────────────────────────────────────
async function saveCandidatesBatch(
  parsedResults: ParsedResume[],
  userId: string,
  tenantId: string,
  parentTimer: PerformanceTimer
): Promise<ParsedResume[]> {
  const t = new PerformanceTimer("save-candidates-batch");

  const client = await getClient();
  try {
    await client.query("BEGIN");

    // Step 1: Prepare list of parsed resumes to save (skip only those with parse errors)
    const nonDuplicateResults: ParsedResume[] = parsedResults.filter((r) => !r.error);

    // Step 2: Insert candidate rows
    const candidatesSchema = await getCandidatesSchemaInfo(client);
    const candidateColumns = [
      "id",
      "full_name",
      "email",
      "phone",
      "status",
      "review_status",
      "tenant_id",
      "consent_given",
      "raw_resume_text",
      ...(candidatesSchema.hasCreatedByUserId ? ["created_by_user_id"] : []),
      ...(candidatesSchema.hasResumeFilePath ? ["resume_file_path"] : []),
      ...(candidatesSchema.hasOriginalFilename ? ["original_filename"] : []),
      ...(candidatesSchema.hasFilePath ? ["file_path"] : []),
      "file_type",
      "created_at",
      "updated_at",
    ];

    const candidateValues: string[] = [];
    const candidateParams: any[] = [];
    let paramIdx = 1;

    for (const r of nonDuplicateResults) {
      const ai = r.parsed;
      const rowParams: any[] = [
        r.candidateId,
        ai.contact?.name || ai.name || null,
        ai.contact?.email || ai.email || null,
        ai.contact?.phone || ai.phone || null,
        "pending",
        "pending",
        tenantId,
        false,
        r.rawText || null,
        ...(candidatesSchema.hasCreatedByUserId ? [userId] : []),
      ];
      if (candidatesSchema.hasResumeFilePath) rowParams.push(r.file.path);
      if (candidatesSchema.hasOriginalFilename) rowParams.push(r.file.originalname);
      if (candidatesSchema.hasFilePath) rowParams.push(r.file.path);
      rowParams.push(normalizeFileType(r.file.mimetype));

      candidateParams.push(...rowParams);
      const placeholders = rowParams.map(() => {
        const p = `$${paramIdx}`;
        paramIdx++;
        return p;
      }).join(", ");
      candidateValues.push(`(${placeholders}, NOW(), NOW())`);
    }

    if (candidateValues.length > 0) {
      await client.query(
        `INSERT INTO candidates (${candidateColumns.join(", ")})
         VALUES ${candidateValues.join(", ")}`,
        candidateParams
      );
    }
    t.step("insert-candidates");

    // Step 3: Insert parsing_jobs in batch for non-duplicates
    const jobValues: string[] = [];
    const jobParams: any[] = [];
    let jobIdx = 1;
    for (const r of nonDuplicateResults) {
      jobParams.push(r.parsingJobId, r.candidateId, r.file.originalname, r.file.path, "completed", r.rawText || null);
      jobValues.push(`($${jobIdx}, $${jobIdx + 1}, $${jobIdx + 2}, $${jobIdx + 3}, $${jobIdx + 4}, NOW(), $${jobIdx + 5}, NOW())`);
      jobIdx += 6;
    }

    if (jobValues.length > 0) {
      await client.query(
        `INSERT INTO parsing_jobs (id, candidate_id, filename, file_path, status, started_at, raw_text, completed_at)
         VALUES ${jobValues.join(", ")}`,
        jobParams
      );
    }
    t.step("insert-parsing-jobs");

    // Step 4: Build child table inserts for non-duplicates
    const workHistoryRows: any[] = [];
    const educationRows: any[] = [];
    const candidateSkillMappings: { candidateId: string; skillName: string }[] = [];
    const certRows: any[] = [];

    for (const r of nonDuplicateResults) {
      const ai = r.parsed;

      // Work history
      const workItems = ai.work_history || ai.work_experience || [];
      for (const w of workItems) {
        workHistoryRows.push([
          uuidv4(),
          r.candidateId,
          w.job_title || w.title || null,
          w.company_name || w.company || null,
          w.start_date || null,
          w.end_date || null,
          w.is_current || false,
          w.description || null,
          w.location || null,
        ]);
      }

      // Education
      const eduItems = ai.education || [];
      for (const e of eduItems) {
        educationRows.push([
          uuidv4(),
          r.candidateId,
          e.degree || e.degree_name || null,
          e.institution || e.institution_name || e.school || null,
          e.field_of_study || e.major || null,
          e.start_date || e.start_year || null,
          e.end_date || e.end_year || e.graduation_date || null,
          e.grade || e.gpa || null,
        ]);
      }

      // Skills
      const rawSkills = ai.skills || [];
      for (const sk of rawSkills) {
        const skillName = typeof sk === "string" ? sk.trim() : (sk.name || sk.skill_name || "").trim();
        if (!skillName) continue;
        candidateSkillMappings.push({ candidateId: r.candidateId, skillName });
      }

      // Certifications
      const certs = ai.certifications || [];
      for (const c of certs) {
        const name = typeof c === "string" ? c : c.name || "";
        if (!name) continue;
        certRows.push([uuidv4(), r.candidateId, name.trim()]);
      }
    }

    await batchInsert(client, "work_history", ["id", "candidate_id", "job_title", "company_name", "start_date", "end_date", "is_current", "description", "location"], workHistoryRows);
    await batchInsert(client, "education", ["id", "candidate_id", "degree", "institution", "field_of_study", "start_date", "end_date", "gpa"], educationRows);
    await saveSkillsBatch(client, candidateSkillMappings);
    await batchInsert(client, "certifications", ["id", "candidate_id", "name"], certRows);

    // Update candidate status to success
    const candidateIds = nonDuplicateResults.map((r) => r.candidateId);
    if (candidateIds.length > 0) {
      await client.query(
        `UPDATE candidates SET status = 'success', review_status = 'pending' WHERE id = ANY($1)`,
        [candidateIds]
      );
    }

    await client.query("COMMIT");
    t.step("child-inserts");
    t.end();
    parentTimer.step(`saved-batch:${nonDuplicateResults.length}`);

    return parsedResults;
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("❌ Bulk save failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function batchInsert(
  client: any,
  table: string,
  columns: string[],
  rows: any[][]
): Promise<void> {
  if (rows.length === 0) return;

  const values: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (const row of rows) {
    const placeholders = row.map(() => `$${idx++}`).join(", ");
    values.push(`(${placeholders})`);
    params.push(...row);
  }

  const colList = columns.join(", ");
  const query = `INSERT INTO ${table} (${colList}) VALUES ${values.join(", ")}`;
  await client.query(query, params);
}

async function saveSkillsBatch(
  client: any,
  mappings: { candidateId: string; skillName: string }[]
): Promise<void> {
  if (mappings.length === 0) return;

  const schema = await getSkillsSchemaInfo(client);

  // Legacy schema: skills rows contain candidate_id and skill_name; no normalized_name
  if (!schema.hasNormalizedName || !schema.candidateIdNullable) {
    const skillRows: any[][] = [];
    const csRows: any[][] = [];
    const seen = new Set<string>();
    for (const { candidateId, skillName } of mappings) {
      const displayName = skillName.trim();
      if (!displayName) continue;
      const key = `${candidateId}|${displayName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const skillId = uuidv4();
      skillRows.push([
        skillId,
        candidateId,
        displayName,
        displayName,
        'technical',
        'intermediate',
      ]);
      csRows.push([candidateId, skillId]);
    }
    if (skillRows.length > 0) {
      await batchInsert(client, "skills", ["id", "candidate_id", "skill_name", "name", "category", "proficiency_level"], skillRows);
    }
    if (csRows.length > 0) {
      await batchInsert(client, "candidate_skills", ["candidate_id", "skill_id"], csRows);
    }
    return;
  }

  // Global catalog schema
  // 1) Build a unique set of skill names and prepare rows for global skills table
  const uniqueSkills = new Map<string, { displayName: string; normalizedName: string }>();
  for (const { skillName } of mappings) {
    const displayName = skillName.trim();
    const normalizedName = displayName.toLowerCase();
    if (!uniqueSkills.has(normalizedName)) {
      uniqueSkills.set(normalizedName, { displayName, normalizedName });
    }
  }

  // 2) Upsert all unique skills in one query using ON CONFLICT (name)
  const skillValues: string[] = [];
  const skillParams: any[] = [];
  let idx = 1;
  for (const { displayName, normalizedName } of uniqueSkills.values()) {
    skillValues.push(`($${idx}, $${idx + 1}, $${idx + 2}, 'technical')`);
    skillParams.push(uuidv4(), displayName, normalizedName);
    idx += 3;
  }

  if (skillValues.length > 0) {
    await client.query(
      `INSERT INTO skills (id, name, normalized_name, category)
       VALUES ${skillValues.join(", ")}
       ON CONFLICT (name) DO UPDATE SET normalized_name = EXCLUDED.normalized_name`,
      skillParams
    );
  }

  // 3) Retrieve skill IDs for all names
  const allNames = Array.from(uniqueSkills.keys());
  const idResult = await client.query(
    `SELECT id, LOWER(name) as normalized_name FROM skills WHERE LOWER(name) = ANY($1)`,
    [allNames]
  );
  const skillIdByName = new Map<string, string>();
  for (const row of idResult.rows) {
    skillIdByName.set(row.normalized_name, row.id);
  }

  // 4) Build and insert candidate_skills rows in batch
  const csRows: any[][] = [];
  const seen = new Set<string>();
  for (const { candidateId, skillName } of mappings) {
    const normalizedName = skillName.trim().toLowerCase();
    const skillId = skillIdByName.get(normalizedName);
    if (!skillId) continue;
    const key = `${candidateId}|${skillId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    csRows.push([candidateId, skillId]);
  }

  if (csRows.length > 0) {
    await batchInsert(client, "candidate_skills", ["candidate_id", "skill_id"], csRows);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency helper
// ─────────────────────────────────────────────────────────────────────────────
async function processInChunks<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
  }
  return results;
}

function buildSummary(results: ParsedResume[]) {
  return results.reduce(
    (acc, r) => {
      if (r.error) acc.failed++;
      else if (r.duplicate?.isDuplicate) acc.duplicates++;
      else acc.successful++;
      return acc;
    },
    { successful: 0, duplicates: 0, failed: 0 }
  );
}
