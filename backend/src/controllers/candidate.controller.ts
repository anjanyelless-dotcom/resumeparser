import { Request, Response } from "express";
import crypto from "crypto";
import { transaction, getClient } from "../database/db";
import {
  CandidateModel,
  Candidate,
  CandidateWithDetails,
} from "../models/candidate.model";

interface CreateCandidateRequest {
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  summary?: string;
  raw_resume_text?: string;
  file_path?: string;
  file_type?: string;
  skills?: string[];
  work_experience?: any[];
  education?: any[];
  certifications?: string[];  // Array of certification names from AI parsing
  projects?: string[];        // Array of project descriptions from AI parsing
  confidence_score?: number;  // AI parsing confidence score
}

interface UpdateCandidateRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  summary?: string;
}

// Helper function to parse date strings to YYYY-MM-DD format
function parseDateString(dateStr: string | null | undefined | Date | number): string | null {
  if (!dateStr) return null;

  // Trim whitespace if it's a string
  if (typeof dateStr === 'string') {
    dateStr = dateStr.trim();
    if (!dateStr) return null;
    
    // Check if it matches patterns like "Present", "Current", etc.
    const lower = dateStr.toLowerCase();
    if (lower === 'present' || lower === 'current' || lower === 'now' || lower === 'till date') {
      return null;
    }
  }

  // Convert to string if it's a Date object or number
  let dateString: string;
  if (dateStr instanceof Date) {
    // If it's already a Date object, format it
    const year = dateStr.getFullYear();
    const month = String(dateStr.getMonth() + 1).padStart(2, '0');
    const day = String(dateStr.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (typeof dateStr === 'number') {
    // If it's a year number, ensure it's 4 digits
    const yearNum = dateStr;
    if (yearNum < 100) {
      // Handle 2-digit years: 00-29 -> 2000-2029, 30-99 -> 1930-1999
      const fullYear = yearNum < 30 ? 2000 + yearNum : 1900 + yearNum;
      return `${fullYear}-01-01`;
    } else if (yearNum >= 1900 && yearNum <= 2100) {
      return `${yearNum}-01-01`;
    } else {
      // Invalid year number
      return null;
    }
  } else if (typeof dateStr !== 'string') {
    // If it's not a string, Date, or number, convert to string
    dateString = String(dateStr);
  } else {
    dateString = dateStr;
  }

  // Handle formats like "March 2023", "Jan 2020", etc.
  const monthYearMatch = dateString.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})$/i,
  );
  if (monthYearMatch) {
    const monthMap: { [key: string]: string } = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const month = monthMap[monthYearMatch[1].toLowerCase().substring(0, 3)];
    const year = monthYearMatch[2];
    return `${year}-${month}-01`; // Use first day of the month
  }

  // Handle formats like "2020-2023", "2018 - 2021"
  const yearRangeMatch = dateString.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (yearRangeMatch) {
    return `${yearRangeMatch[1]}-01-01`; // Use start of the range
  }

  // Handle formats like "2023", "2020", or "20", "23"
  const yearOnlyMatch = dateString.match(/^(\d{2,4})$/);
  if (yearOnlyMatch) {
    const yearStr = yearOnlyMatch[1];
    let year: number;
    
    if (yearStr.length === 2) {
      // Handle 2-digit years: 00-29 -> 2000-2029, 30-99 -> 1930-1999
      const yearNum = parseInt(yearStr, 10);
      year = yearNum < 30 ? 2000 + yearNum : 1900 + yearNum;
    } else {
      year = parseInt(yearStr, 10);
    }
    
    // Validate year is in reasonable range
    if (year >= 1900 && year <= 2100) {
      return `${year}-01-01`;
    }
  }

  // Try to parse as a regular date (YYYY-MM-DD, MM/DD/YYYY, etc.)
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    // Validate year is reasonable (not 0001, 0020, etc.)
    if (year >= 1900 && year <= 2100) {
      return date.toISOString().split("T")[0];
    }
  }

  return null; // Return null if unable to parse
}

// Validate date format before using it
function validateDateFormat(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  // Check if it matches YYYY-MM-DD format
  const dateFormatMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateFormatMatch) return null;
  
  const year = parseInt(dateFormatMatch[1], 10);
  const month = parseInt(dateFormatMatch[2], 10);
  const day = parseInt(dateFormatMatch[3], 10);
  
  // Validate ranges
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  return dateStr;
}

/**
 * Parse a grade/GPA value from the AI parser to a numeric float suitable for
 * the DOUBLE PRECISION `gpa` DB column. Handles:
 *   "3.8/4.0" → 3.8, "8.5/10" → 8.5, "3.8" → 3.8, 85 → 85, null → null
 */
function parseGrade(raw: any): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (!s) return null;
  const slashMatch = s.match(/^(\d+\.?\d*)\s*\/\s*\d+\.?\d*$/);
  if (slashMatch) {
    const n = parseFloat(slashMatch[1]);
    return isFinite(n) ? n : null;
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

const mapCandidateWithParsingStatus = (candidate: any) => {
  if (!candidate) return null;
  return {
    ...candidate,
    parsing_status: {
      status: candidate.pj_status || candidate.status || 'pending',
      progress: candidate.pj_status === 'completed' ? 100 : (candidate.pj_status === 'failed' ? 0 : 50),
      confidence_score: candidate.pj_confidence_score !== null && candidate.pj_confidence_score !== undefined
        ? parseFloat(candidate.pj_confidence_score)
        : null,
      error_message: candidate.pj_error_message || null
    }
  };
};

export const createCandidate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const candidateData: CreateCandidateRequest = req.body;
    const userId = (req as any).user?.id;

    const client = await getClient();
    try {
      // Begin transaction
      await client.query("BEGIN");

      const candidate = await CandidateModel.create(client, candidateData);

      // Save nested skills if provided
      if (candidateData.skills && Array.isArray(candidateData.skills)) {
        const tableCheck = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = 'candidate_skills'
        `);

        if (tableCheck.rows.length > 0) {
          for (const skillName of candidateData.skills) {
            if (!skillName || typeof skillName !== "string") continue;
            
            const existingSkill = await client.query(
              "SELECT id FROM skills WHERE name = $1",
              [skillName],
            );

            let skillId: string;
            if (existingSkill.rows.length > 0) {
              skillId = existingSkill.rows[0].id;
            } else {
              const newSkill = await client.query(
                "INSERT INTO skills (id, name, category) VALUES ($1, $2, $3) RETURNING id",
                [crypto.randomUUID(), skillName, "technical"],
              );
              skillId = newSkill.rows[0].id;
            }

            // Check if association already exists
            const linkCheck = await client.query(
              "SELECT 1 FROM candidate_skills WHERE candidate_id = $1 AND skill_id = $2",
              [candidate.id, skillId]
            );
            if (linkCheck.rows.length === 0) {
              await client.query(
                "INSERT INTO candidate_skills (candidate_id, skill_id, proficiency_level) VALUES ($1, $2, $3)",
                [candidate.id, skillId, "intermediate"],
              );
            }
          }
        } else {
          // Flat skills table design: delete and insert directly
          await client.query(
            "DELETE FROM skills WHERE candidate_id = $1",
            [candidate.id]
          );

          for (const skillName of candidateData.skills) {
            if (!skillName || typeof skillName !== "string") continue;
            await client.query(
              `INSERT INTO skills (id, candidate_id, name, category, proficiency_level, confidence_score) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                crypto.randomUUID(),
                candidate.id,
                skillName.trim().substring(0, 255),
                "technical",
                "intermediate",
                1.0
              ]
            );
          }
        }
      }

      // Save nested work experience if provided
      if (candidateData.work_experience && Array.isArray(candidateData.work_experience)) {
        for (const work of candidateData.work_experience) {
          // Infer is_current if end_date represents present/current
          let isCurrent = work.is_current || false;
          if (work.end_date) {
            const endLower = String(work.end_date).trim().toLowerCase();
            if (endLower === 'present' || endLower === 'current' || endLower === 'till date' || endLower === 'now') {
              isCurrent = true;
            }
          }

          const workQuery = `
            INSERT INTO work_history (id, candidate_id, job_title, company_name, start_date, end_date, is_current, description, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;
          await client.query(workQuery, [
            crypto.randomUUID(),
            candidate.id,
            work.job_title || work.title || null,
            work.company_name || work.company || null,
            validateDateFormat(parseDateString(work.start_date || null)),
            validateDateFormat(parseDateString(work.end_date || null)),
            isCurrent,
            work.description || null,
            work.location || null,
          ]);
        }
      }

      // Save nested education if provided
      if (candidateData.education && Array.isArray(candidateData.education)) {
        for (const edu of candidateData.education) {
          const eduQuery = `
            INSERT INTO education (id, candidate_id, degree, institution, field_of_study, start_date, end_date, gpa)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;
          await client.query(eduQuery, [
            crypto.randomUUID(),
            candidate.id,
            edu.degree || edu.degree_name || null,
            edu.institution || edu.institution_name || null,
            edu.field_of_study || null,
            validateDateFormat(parseDateString(edu.start_date || edu.start_year || null)),
            validateDateFormat(parseDateString(edu.end_date || edu.end_year || null)),
            parseGrade(edu.grade ?? edu.gpa ?? null),  // DeBERTa outputs 'grade'; OpenAI/legacy outputs 'gpa'
          ]);
        }
      }

      // Save certifications if provided
      if (candidateData.certifications && Array.isArray(candidateData.certifications)) {
        for (const certName of candidateData.certifications) {
          if (!certName || typeof certName !== "string") continue;
          try {
            await client.query(
              `INSERT INTO certifications (id, candidate_id, name) VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [crypto.randomUUID(), candidate.id, certName.trim()]
            );
          } catch (certInsertErr: any) {
            // Table may not exist yet; skip gracefully
            console.warn("Could not insert certification (table may not exist yet):", certInsertErr.message);
            continue;
          }
        }
      }

      // Save projects as JSONB on the candidate record
      if (candidateData.projects && Array.isArray(candidateData.projects) && candidateData.projects.length > 0) {
        try {
          await client.query(
            "UPDATE candidates SET projects = $1 WHERE id = $2",
            [JSON.stringify(candidateData.projects), candidate.id]
          );
        } catch (projUpdateErr: any) {
          // Column may not exist yet if migration hasn't run
          console.warn("Could not save projects (column may not exist yet):", projUpdateErr.message);
        }
      }

      // Check if we are inserting already parsed data (manual profile creation or preview save)
      const hasParsedData = 
        (candidateData.skills && candidateData.skills.length > 0) ||
        (candidateData.work_experience && candidateData.work_experience.length > 0) ||
        (candidateData.education && candidateData.education.length > 0);

      if (hasParsedData) {
        // Insert completed parsing job record
        const parsedDataJson = {
          name: candidateData.full_name || candidateData.name,
          email: candidateData.email,
          phone: candidateData.phone,
          summary: candidateData.summary,
          skills: candidateData.skills || [],
          work_experience: candidateData.work_experience || [],
          education: candidateData.education || [],
          certifications: candidateData.certifications || [],
          projects: candidateData.projects || [],
        };

        const filename = candidateData.file_path 
          ? candidateData.file_path.split(/[/\\]/).pop() 
          : `${candidate.full_name || "candidate"}_resume.pdf`;

        // Calculate a realistic confidence score based on data completeness if not provided
        let calculatedConfidence = 0.0;
        if (candidateData.work_experience && candidateData.work_experience.length > 0) calculatedConfidence += 0.35;
        if (candidateData.education && candidateData.education.length > 0) calculatedConfidence += 0.25;
        if (candidateData.skills && candidateData.skills.length > 0) calculatedConfidence += 0.20;
        if (candidateData.summary && candidateData.summary.length > 0) calculatedConfidence += 0.10;
        if (candidateData.email || candidateData.phone) calculatedConfidence += 0.10;
        
        // Cap at 0.98 to look realistic
        calculatedConfidence = Math.min(calculatedConfidence, 0.98);

        const confidenceToSave = candidateData.confidence_score !== undefined 
          ? candidateData.confidence_score 
          : (calculatedConfidence || 0.85);

        await client.query(
          `INSERT INTO parsing_jobs (id, candidate_id, filename, file_path, status, confidence_score, parsed_data, started_at, completed_at) 
           VALUES ($1, $2, $3, $4, 'completed', $5, $6, NOW(), NOW())`,
          [crypto.randomUUID(), candidate.id, filename, candidateData.file_path || `uploads/${filename}`, confidenceToSave, JSON.stringify(parsedDataJson)],
        );

        // Update candidate status to success since parsing is complete
        await client.query(
          "UPDATE candidates SET status = 'success' WHERE id = $1",
          [candidate.id]
        );
        candidate.status = 'success';

        await client.query("COMMIT");

        res.status(201).json({
          message: "Candidate created and details saved successfully",
          candidate,
        });
      } else if (candidateData.file_path && candidateData.file_type) {
        // Fallback: if no nested data but file path is provided, we just save the candidate.
        // Synchronous parsing happens in upload.controller.ts now.
        const filename = candidateData.file_path 
          ? candidateData.file_path.split(/[/\\]/).pop() 
          : `${candidate.full_name || "candidate"}_resume.pdf`;

        await client.query(
          `INSERT INTO parsing_jobs (candidate_id, filename, file_path, status, started_at) 
           VALUES ($1, $2, $3, 'pending', NOW())`,
          [candidate.id, filename, candidateData.file_path],
        );
        await client.query("COMMIT");
        res.status(201).json({
          message: "Candidate created successfully. Resume parsing must be done via the upload endpoint.",
          candidate,
        });
      } else {
        await client.query("COMMIT");
        res.status(201).json({
          message: "Candidate created successfully",
          candidate,
        });
      }
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create candidate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllCandidates = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || undefined;
    const company = (req.query.company as string) || undefined;
    const jobTitle = (req.query.job_title as string) || undefined;
    const certification = (req.query.certification as string) || undefined;
    const salaryMin = req.query.salary_min ? parseFloat(req.query.salary_min as string) : undefined;
    const salaryMax = req.query.salary_max ? parseFloat(req.query.salary_max as string) : undefined;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        error:
          "Invalid pagination parameters. Page must be ≥1, limit must be between 1-100",
      });
      return;
    }

    const client = await getClient();
    try {
      const { candidates, total } = await CandidateModel.findAll(
        client,
        page,
        limit,
        search,
        company,
        jobTitle,
        certification,
        salaryMin,
        salaryMax,
      );

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        candidates: candidates.map(mapCandidateWithParsingStatus),
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: total,
          items_per_page: limit,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get all candidates error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCandidateById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const candidateId = Array.isArray(id) ? id[0] : id;

    if (!candidateId) {
      res.status(400).json({ error: "Candidate ID is required" });
      return;
    }

    const client = await getClient();
    try {
      const candidate = await CandidateModel.findByIdWithDetails(
        client,
        candidateId,
      );

      if (!candidate) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }

      res.json({ candidate: mapCandidateWithParsingStatus(candidate) });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get candidate by ID error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateCandidate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const candidateId = Array.isArray(id) ? id[0] : id;
    const updates: UpdateCandidateRequest = req.body;

    if (!candidateId) {
      res.status(400).json({ error: "Candidate ID is required" });
      return;
    }

    if (Object.keys(updates).length === 0) {
      res
        .status(400)
        .json({ error: "At least one field must be provided for update" });
      return;
    }

    const client = await getClient();
    try {
      const candidate = await CandidateModel.update(
        client,
        candidateId,
        updates,
      );

      if (!candidate) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }

      res.json({
        message: "Candidate updated successfully",
        candidate,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update candidate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteCandidate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const candidateId = Array.isArray(id) ? id[0] : id;

    if (!candidateId) {
      res.status(400).json({ error: "Candidate ID is required" });
      return;
    }

    const client = await getClient();
    try {
      const deleted = await CandidateModel.softDelete(client, candidateId);

      if (!deleted) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }

      res.json({
        message: "Candidate deleted successfully",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete candidate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCandidateParsingStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const candidateId = Array.isArray(id) ? id[0] : id;

    if (!candidateId) {
      res.status(400).json({ error: "Candidate ID is required" });
      return;
    }

    const client = await getClient();
    try {
      const parsingJob = await CandidateModel.getParsingStatus(
        client,
        candidateId,
      );

      if (!parsingJob) {
        res.status(404).json({
          error: "No parsing job found for this candidate",
          candidate_id: id,
        });
        return;
      }

      res.json({
        candidate_id: id,
        parsing_status: parsingJob,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get parsing status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

import fs from "fs";

export const importCandidatesFromCSV = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No CSV file uploaded" });
      return;
    }

    const csvContent = fs.readFileSync(req.file.path, "utf8");
    const parsedRows = parseCSV(csvContent);

    if (parsedRows.length === 0) {
      res.status(400).json({ error: "No records found in CSV" });
      return;
    }

    const client = await getClient();
    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      for (const row of parsedRows) {
        const name = row.name || row.full_name || row.candidate_name;
        const email = row.email;

        if (!name) {
          failedCount++;
          errors.push(`Row ${importedCount + failedCount + 1}: Missing name`);
          continue;
        }

        try {
          await client.query("BEGIN");

          const emailHash = email
            ? crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex")
            : null;

          // Deduplication: check if email hash already exists
          if (emailHash) {
            const dupCheck = await client.query(
              "SELECT id FROM candidates WHERE email_hash = $1 AND status = 'success'",
              [emailHash]
            );
            if (dupCheck.rows.length > 0) {
              failedCount++;
              errors.push(`Row ${importedCount + failedCount + 1}: Duplicate candidate with email ${email}`);
              await client.query("ROLLBACK");
              continue;
            }
          }

          const candidateData = {
            id: crypto.randomUUID(),
            full_name: name,
            email: email || null,
            phone: row.phone || null,
            location: row.location || null,
            linkedin_url: row.linkedin || row.linkedin_url || null,
            github_url: row.github || row.github_url || null,
            summary: row.summary || null,
            status: "success",
            review_status: "pending",
          };

          const candidate = await CandidateModel.create(client, candidateData);

          // Save skills if provided
          const skillsStr = row.skills || row.skills_list || "";
          if (skillsStr) {
            const skillNames = skillsStr.split(";").map((s: string) => s.trim()).filter(Boolean);
            const tableCheck = await client.query(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_name = 'candidate_skills'
            `);

            if (tableCheck.rows.length > 0) {
              for (const skillName of skillNames) {
                const existingSkill = await client.query(
                  "SELECT id FROM skills WHERE name = $1",
                  [skillName],
                );

                let skillId: string;
                if (existingSkill.rows.length > 0) {
                  skillId = existingSkill.rows[0].id;
                } else {
                  const newSkill = await client.query(
                    "INSERT INTO skills (id, name, category) VALUES ($1, $2, $3) RETURNING id",
                    [crypto.randomUUID(), skillName, "technical"],
                  );
                  skillId = newSkill.rows[0].id;
                }

                await client.query(
                  "INSERT INTO candidate_skills (candidate_id, skill_id, proficiency_level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                  [candidate.id, skillId, "intermediate"],
                );
              }
            } else {
              // Delete existing flat skills
              await client.query(
                "DELETE FROM skills WHERE candidate_id = $1",
                [candidate.id]
              );

              for (const skillName of skillNames) {
                await client.query(
                  `INSERT INTO skills (id, candidate_id, name, category, proficiency_level, confidence_score) 
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [
                    crypto.randomUUID(),
                    candidate.id,
                    skillName.substring(0, 255),
                    "technical",
                    "intermediate",
                    1.0
                  ]
                );
              }
            }
          }

          // Create parsing job record
          const parsedDataJson = {
            name: candidateData.full_name,
            email: candidateData.email,
            phone: candidateData.phone,
            summary: candidateData.summary,
            skills: skillsStr ? skillsStr.split(";").map((s: string) => s.trim()) : [],
            work_experience: [],
            education: [],
            certifications: [],
            projects: [],
          };

          // Calculate a realistic confidence score for CSV imports
          let calculatedConfidence = 0.40; // Base score for manual import
          if (candidateData.summary) calculatedConfidence += 0.15;
          if (candidateData.email || candidateData.phone) calculatedConfidence += 0.15;
          if (skillsStr) calculatedConfidence += 0.20;

          await client.query(
            `INSERT INTO parsing_jobs (id, candidate_id, filename, file_path, status, confidence_score, parsed_data, started_at, completed_at) 
             VALUES ($1, $2, $3, $4, 'completed', $5, $6, NOW(), NOW())`,
            [crypto.randomUUID(), candidate.id, "imported_from_csv.pdf", "uploads/imported_from_csv.pdf", calculatedConfidence, JSON.stringify(parsedDataJson)],
          );

          await client.query("COMMIT");
          importedCount++;
        } catch (rowErr: any) {
          await client.query("ROLLBACK");
          failedCount++;
          errors.push(`Row ${importedCount + failedCount + 1}: ${rowErr.message}`);
        }
      }
    } finally {
      client.release();
      // Clean up uploaded CSV file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} candidates. ${failedCount} failures.`,
      imported_count: importedCount,
      failed_count: failedCount,
      errors,
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

function parseCSV(content: string): any[] {
  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"“”]/g, ''));
  const results: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse line handling basic quotes
    const values: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    results.push(row);
  }
  return results;
}

export const getDuplicates = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const client = await getClient();
    try {
      const query = `
        SELECT dc.id as duplicate_relationship_id, dc.similarity_score, dc.status as relationship_status, dc.created_at,
               c1.id as candidate_1_id, c1.full_name as candidate_1_name, c1.email as candidate_1_email,
               c2.id as candidate_2_id, c2.full_name as candidate_2_name, c2.email as candidate_2_email
        FROM duplicate_candidates dc
        JOIN candidates c1 ON dc.candidate_id_1 = c1.id
        JOIN candidates c2 ON dc.candidate_id_2 = c2.id
        WHERE dc.status = 'pending' AND c1.status != 'deleted' AND c2.status != 'deleted'
        ORDER BY dc.created_at DESC
      `;
      const result = await client.query(query);
      res.json({ success: true, duplicates: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Get duplicates error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

export const mergeCandidates = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { primaryId, duplicateId } = req.body;

    if (!primaryId || !duplicateId) {
      res.status(400).json({ error: "Both primaryId and duplicateId are required" });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Get primary and duplicate candidates
      const primaryRes = await client.query("SELECT * FROM candidates WHERE id = $1 AND status != 'deleted'", [primaryId]);
      const duplicateRes = await client.query("SELECT * FROM candidates WHERE id = $1 AND status != 'deleted'", [duplicateId]);

      if (primaryRes.rows.length === 0 || duplicateRes.rows.length === 0) {
        res.status(404).json({ error: "One or both candidates not found" });
        await client.query("ROLLBACK");
        return;
      }

      const primary = primaryRes.rows[0];
      const duplicate = duplicateRes.rows[0];

      // Update primary details if missing and present on duplicate
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let index = 1;

      const fieldsToMerge = ["phone", "location", "linkedin_url", "github_url", "summary"];
      for (const field of fieldsToMerge) {
        if (!primary[field] && duplicate[field]) {
          updateFields.push(`${field} = $${index}`);
          updateValues.push(duplicate[field]);
          index++;
        }
      }

      if (updateFields.length > 0) {
        updateValues.push(primaryId);
        await client.query(
          `UPDATE candidates SET ${updateFields.join(", ")}, updated_at = NOW() WHERE id = $${index}`,
          updateValues
        );
      }

      // Merge work experience (update duplicate's experience candidate_id to primary)
      await client.query(
        "UPDATE work_experience SET candidate_id = $1 WHERE candidate_id = $2",
        [primaryId, duplicateId]
      );

      // Merge education (update duplicate's education candidate_id to primary)
      await client.query(
        "UPDATE education SET candidate_id = $1 WHERE candidate_id = $2",
        [primaryId, duplicateId]
      );

      // Merge certifications
      // Delete conflicting certifications first
      const primaryCerts = await client.query("SELECT name FROM certifications WHERE candidate_id = $1", [primaryId]);
      const primaryCertNames = primaryCerts.rows.map((c: any) => c.name.toLowerCase().trim());
      if (primaryCertNames.length > 0) {
        await client.query(
          "DELETE FROM certifications WHERE candidate_id = $1 AND LOWER(TRIM(name)) = ANY($2)",
          [duplicateId, primaryCertNames]
        );
      }
      await client.query(
        "UPDATE certifications SET candidate_id = $1 WHERE candidate_id = $2",
        [primaryId, duplicateId]
      );

      // Merge skills
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'candidate_skills'
      `);

      if (tableCheck.rows.length > 0) {
        const primarySkills = await client.query("SELECT skill_id FROM candidate_skills WHERE candidate_id = $1", [primaryId]);
        const primarySkillIds = primarySkills.rows.map((s: any) => s.skill_id);
        if (primarySkillIds.length > 0) {
          await client.query(
            "DELETE FROM candidate_skills WHERE candidate_id = $1 AND skill_id = ANY($2)",
            [duplicateId, primarySkillIds]
          );
        }
        await client.query(
          "UPDATE candidate_skills SET candidate_id = $1 WHERE candidate_id = $2",
          [primaryId, duplicateId]
        );
      } else {
        const primarySkills = await client.query("SELECT LOWER(TRIM(skill_name)) as name FROM skills WHERE candidate_id = $1", [primaryId]);
        const primarySkillNames = primarySkills.rows.map((s: any) => s.name);
        if (primarySkillNames.length > 0) {
          await client.query(
            "DELETE FROM skills WHERE candidate_id = $1 AND LOWER(TRIM(skill_name)) = ANY($2)",
            [duplicateId, primarySkillNames]
          );
        }
        await client.query(
          "UPDATE skills SET candidate_id = $1 WHERE candidate_id = $2",
          [primaryId, duplicateId]
        );
      }

      // Merge projects: Merge unique projects lists if candidates have them
      let mergedProjects = [];
      const primaryProj = primary.projects ? (Array.isArray(primary.projects) ? primary.projects : JSON.parse(primary.projects)) : [];
      const dupProj = duplicate.projects ? (Array.isArray(duplicate.projects) ? duplicate.projects : JSON.parse(duplicate.projects)) : [];
      const uniqueProjectsSet = new Set([...primaryProj, ...dupProj]);
      mergedProjects = Array.from(uniqueProjectsSet);

      if (mergedProjects.length > 0) {
        await client.query(
          "UPDATE candidates SET projects = $1 WHERE id = $2",
          [JSON.stringify(mergedProjects), primaryId]
        );
      }

      // Soft delete duplicate candidate
      await client.query(
        "UPDATE candidates SET status = 'deleted', review_status = 'merged', deleted_at = NOW() WHERE id = $1",
        [duplicateId]
      );

      // Update duplicate relationship status
      const [c1, c2] = [primaryId, duplicateId].sort();
      await client.query(
        "UPDATE duplicate_candidates SET status = 'merged' WHERE (candidate_id_1 = $1 AND candidate_id_2 = $2)",
        [c1, c2]
      );

      await client.query("COMMIT");
      res.json({ success: true, message: "Candidates merged successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Merge candidates error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

export const ignoreDuplicate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { duplicateRelationshipId } = req.body;

    if (!duplicateRelationshipId) {
      res.status(400).json({ error: "duplicateRelationshipId is required" });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Get duplicates relationship
      const relRes = await client.query("SELECT * FROM duplicate_candidates WHERE id = $1", [duplicateRelationshipId]);
      if (relRes.rows.length === 0) {
        res.status(404).json({ error: "Duplicate relationship record not found" });
        await client.query("ROLLBACK");
        return;
      }

      const relationship = relRes.rows[0];

      // Update relationship status to 'ignored'
      await client.query(
        "UPDATE duplicate_candidates SET status = 'ignored' WHERE id = $1",
        [duplicateRelationshipId]
      );

      // Update candidate review statuses: check if either candidate has any other active duplicate relationships
      const c1 = relationship.candidate_id_1;
      const c2 = relationship.candidate_id_2;

      for (const cid of [c1, c2]) {
        const otherDups = await client.query(
          `SELECT 1 FROM duplicate_candidates 
           WHERE (candidate_id_1 = $1 OR candidate_id_2 = $1) 
           AND status = 'pending' AND id != $2`,
          [cid, duplicateRelationshipId]
        );
        if (otherDups.rows.length === 0) {
          // No other pending duplicates, change review_status from duplicate back to pending
          await client.query(
            "UPDATE candidates SET review_status = 'pending' WHERE id = $1 AND review_status = 'duplicate'",
            [cid]
          );
        }
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Duplicate relationship ignored successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Ignore duplicate error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};


