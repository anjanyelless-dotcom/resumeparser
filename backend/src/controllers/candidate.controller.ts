import { Request, Response } from "express";
import crypto from "crypto";
import { transaction, getClient, query } from "../database/db";
import {
  CandidateModel,
  Candidate,
  CandidateWithDetails,
} from "../models/candidate.model";
import {
  calculateExperienceFromWorkHistory,
  extractExperienceFromText,
  getBestExperience,
} from "../services/experience.service";
import { checkDuplicateBeforeInsert } from "../services/duplicate.service";
import { calculateTotalExperience } from "../utils/experienceCalculator";

interface CreateCandidateRequest {
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  summary?: string;
  raw_resume_text?: string;
  status?: string;

  file_type?: string;
  skills?: string[];
  work_history?: any[];
  work_experience?: any[];  // Legacy field name support for frontend compatibility
  education?: any[];
  certifications?: string[];  // Array of certification names from AI parsing
  projects?: string[];        // Array of project descriptions from AI parsing
  confidence_score?: number;  // Optional explicit confidence score
  resume_hash?: string;
  forceSave?: boolean;
}

interface UpdateCandidateRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
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
  console.time("candidate_create_total");
  console.log("=== BULLETPROOF CREATE CANDIDATE START ===");

  const warnings: string[] = [];
  let candidate: any = null;
  const client = await getClient();

  try {
    // Prepare candidate data with required metadata
    const candidateData = {
      ...req.body,
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenant_id || "default",
    };

    // Handle field name mapping: work_experience -> work_history
    if (candidateData.work_experience && !candidateData.work_history) {
      console.log("Mapping work_experience to work_history");
      candidateData.work_history = candidateData.work_experience;
    }

    console.log("CANDIDATE DATA:", {
      name: candidateData.name,
      email: candidateData.email,
      phone: candidateData.phone,
      skillsCount: candidateData.skills?.length || 0,
      workExperienceCount: candidateData.work_history?.length || 0,
      educationCount: candidateData.education?.length || 0,
      certificationsCount: candidateData.certifications?.length || 0,
      projectsCount: candidateData.projects?.length || 0,
    });

    // ── PHASE 1: SAVE CANDIDATE (MUST SUCCEED) ────────────────────────
    console.time("candidate_save");
    console.log("PHASE 1 - Saving Candidate Basic Info");

    candidate = await saveCandidateWithDuplicateHandling(client, candidateData, warnings);
    console.log("✅ Candidate saved successfully with ID:", candidate.id);
    console.timeEnd("candidate_save");

    // ── PHASE 2: SAVE CHILD DATA (BEST EFFORT) ────────────────────────
    console.log("PHASE 2 - Saving Child Data (Best Effort)");

    // Save Skills (non-blocking)
    await saveSkillsBestEffort(client, candidate.id, candidateData.skills, warnings);

    // Save Education (non-blocking)  
    await saveEducationBestEffort(client, candidate.id, candidateData.education, warnings);

    // Save Work Experience (non-blocking)
    await saveWorkExperienceBestEffort(client, candidate.id, candidateData.work_history, warnings);

    // Save Certifications (non-blocking)
    await saveCertificationsBestEffort(client, candidate.id, candidateData.certifications, warnings);

    // Save Projects (non-blocking)
    await saveProjectsBestEffort(client, candidate.id, candidateData.projects, warnings);

    // Save Activity Log (non-blocking)
    await saveActivityLogBestEffort(client, candidate.id, candidateData, warnings);

    // Save Parsing Data (non-blocking)
    await saveParsingDataBestEffort(client, candidate.id, candidateData, warnings);

    console.log("✅ All child data processed");

    // ── PHASE 3: RETURN SUCCESS ─────────────────────────────────────
    console.timeEnd("candidate_create_total");

    const finalCandidate = await CandidateModel.findByIdWithDetails(client, candidate.id);

    res.status(201).json({
      success: true,
      message: "Candidate created successfully",
      candidate: finalCandidate,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

    console.log("=== BULLETPROOF CREATE CANDIDATE COMPLETE ===");

  } catch (error: any) {
    console.timeEnd("candidate_create_total");
    console.error("=== CANDIDATE CREATION FAILED ===");
    console.error("Error:", error.message);

    // If we got here, even the basic candidate save failed
    res.status(500).json({
      success: false,
      error: "Failed to save candidate",
      message: error.message,
      warnings: warnings,
    });
  } finally {
    client.release();
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
    const jobId = (req.query.job_id as string) || undefined;
    const myCandidates = req.query.myCandidates === 'true' ? (req as any).user?.id : undefined;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 500) {
      res.status(400).json({
        error:
          "Invalid pagination parameters. Page must be ≥1, limit must be between 1-500",
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
        jobId,
        myCandidates,
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
          has_previous_page: hasPrevPage,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Get all candidates error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
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
      const candidate = await CandidateModel.findByIdWithDetails(client, candidateId);

      if (!candidate) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }

      res.json({ candidate: mapCandidateWithParsingStatus(candidate) });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Get candidate by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

export const getFilterOptions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const client = await getClient();
    try {
      // Get unique companies, job titles, and certifications
      const [companiesResult, jobTitlesResult, certificationsResult] = await Promise.all([
        client.query("SELECT DISTINCT company FROM work_history WHERE company IS NOT NULL ORDER BY company"),
        client.query("SELECT DISTINCT job_title FROM work_history WHERE job_title IS NOT NULL ORDER BY job_title"),
        client.query("SELECT DISTINCT name FROM certifications WHERE name IS NOT NULL ORDER BY name")
      ]);

      res.json({
        companies: companiesResult.rows.map(row => row.company),
        job_titles: jobTitlesResult.rows.map(row => row.job_title),
        certifications: certificationsResult.rows.map(row => row.name)
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Get filter options error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
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

export const updateCandidateWithFullData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const candidateId = Array.isArray(id) ? id[0] : id;
    const updates: any = req.body;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id || "default";

    console.log("=== UPDATE CANDIDATE WITH FULL DATA START ===");
    console.log("CANDIDATE ID:", candidateId);
    console.log("REQUEST BODY:", JSON.stringify(updates, null, 2));

    if (!candidateId) {
      res.status(400).json({ error: "Candidate ID is required" });
      return;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "At least one field must be provided for update" });
      return;
    }

    const client = await getClient();
    try {
      // Begin transaction
      await client.query("BEGIN");

      // Check if candidate exists
      const existingCandidate = await CandidateModel.findByIdWithDetails(client, candidateId);
      if (!existingCandidate) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Candidate not found" });
        return;
      }

      console.log("Found existing candidate:", existingCandidate.full_name);

      // Update basic candidate fields
      const basicUpdates: Record<string, any> = {
        email: updates.email,
        phone: updates.phone,
        full_name: updates.full_name || updates.name,
        summary: updates.summary,
        raw_resume_text: updates.raw_resume_text,
        linkedin_url: updates.linkedin_url,
        github_url: updates.github_url,
        portfolio_url: updates.portfolio_url,
        location: updates.location,
        years_experience: updates.years_experience,
        current_title: updates.current_title,
        current_company: updates.current_company,
        total_experience_years: updates.total_experience_years,
        updated_at: new Date(),
      };

      // Remove undefined values
      const filteredUpdates: Record<string, any> = {};
      Object.keys(basicUpdates).forEach(key => {
        if (basicUpdates[key] !== undefined) {
          filteredUpdates[key] = basicUpdates[key];
        }
      });

      if (Object.keys(filteredUpdates).length > 0) {
        const setClause = Object.keys(filteredUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [candidateId, ...Object.values(filteredUpdates)];

        await client.query(
          `UPDATE candidates SET ${setClause} WHERE id = $1`,
          values
        );
        console.log("Updated basic candidate fields");
      }

      // Update skills if provided
      if (updates.skills && Array.isArray(updates.skills)) {
        console.log("Updating skills, count:", updates.skills.length);

        // Delete existing skills
        await client.query("DELETE FROM candidate_skills WHERE candidate_id = $1", [candidateId]);

        // Insert new skills
        let insertedCount = 0;
        for (const skillName of updates.skills) {
          if (!skillName || typeof skillName !== "string") continue;

          try {
            // Check if skill already exists in skills table
            const existingSkill = await client.query(
              "SELECT id FROM skills WHERE name = $1",
              [skillName.trim().substring(0, 255)]
            );

            let skillId;
            if (existingSkill.rows.length > 0) {
              skillId = existingSkill.rows[0].id;
            } else {
              // Create new skill
              const newSkillResult = await client.query(
                "INSERT INTO skills (id, name) VALUES ($1, $2) RETURNING id",
                [crypto.randomUUID(), skillName.trim().substring(0, 255)]
              );
              skillId = newSkillResult.rows[0].id;
            }

            // Link skill to candidate
            await client.query(
              "INSERT INTO candidate_skills (candidate_id, skill_id) VALUES ($1, $2)",
              [candidateId, skillId]
            );
            insertedCount++;
          } catch (skillErr: any) {
            console.warn("Could not insert skill:", skillName, skillErr.message);
          }
        }
        console.log("Updated skills count:", insertedCount);
      }

      // Update work history if provided
      if (updates.work_history && Array.isArray(updates.work_history)) {
        console.log("Updating work history, count:", updates.work_history.length);

        // Delete existing work history
        await client.query("DELETE FROM work_history WHERE candidate_id = $1", [candidateId]);

        // Insert new work history
        let insertedCount = 0;
        for (const work of updates.work_history) {
          if (!work || (!work.job_title && !work.company_name)) continue;

          try {
            const workQuery = `
              INSERT INTO work_history (id, candidate_id, job_title, company_name, start_date, end_date, is_current, description, location)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            const workParams = [
              crypto.randomUUID(),
              candidateId,
              work.job_title || work.title || null,
              work.company_name || work.company || null,
              work.start_date || null,
              work.end_date || null,
              work.is_current || false,
              work.description || null,
              work.location || null,
            ];
            await client.query(workQuery, workParams);
            insertedCount++;
          } catch (workErr: any) {
            console.warn("Could not insert work experience:", work.job_title, workErr.message);
          }
        }
        console.log("Updated work history count:", insertedCount);
      }

      // Update education if provided
      if (updates.education && Array.isArray(updates.education)) {
        console.log("Updating education, count:", updates.education.length);

        // Delete existing education
        await client.query("DELETE FROM education WHERE candidate_id = $1", [candidateId]);

        // Insert new education
        let insertedCount = 0;
        for (const edu of updates.education) {
          if (!edu || (!edu.degree && !edu.institution)) continue;

          try {
            const eduQuery = `
              INSERT INTO education (id, candidate_id, degree, institution, field_of_study, start_date, end_date, gpa)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            const eduParams = [
              crypto.randomUUID(),
              candidateId,
              edu.degree || edu.degree_name || null,
              edu.institution || edu.institution_name || null,
              edu.field_of_study || null,
              edu.start_date || edu.start_year || null,
              edu.end_date || edu.end_year || null,
              edu.grade || edu.gpa || null,
            ];
            await client.query(eduQuery, eduParams);
            insertedCount++;
          } catch (eduErr: any) {
            console.warn("Could not insert education:", edu.degree, eduErr.message);
          }
        }
        console.log("Updated education count:", insertedCount);
      }

      // Update certifications if provided
      if (updates.certifications && Array.isArray(updates.certifications)) {
        console.log("Updating certifications, count:", updates.certifications.length);

        // Delete existing certifications
        await client.query("DELETE FROM certifications WHERE candidate_id = $1", [candidateId]);

        // Insert new certifications
        let insertedCount = 0;
        for (const certName of updates.certifications) {
          if (!certName || typeof certName !== "string") continue;

          try {
            await client.query(
              "INSERT INTO certifications (id, candidate_id, name) VALUES ($1, $2, $3)",
              [crypto.randomUUID(), candidateId, certName.trim()]
            );
            insertedCount++;
          } catch (certErr: any) {
            console.warn("Could not insert certification:", certName, certErr.message);
          }
        }
        console.log("Updated certifications count:", insertedCount);
      }

      // Update projects if provided
      if (updates.projects && Array.isArray(updates.projects)) {
        console.log("Updating projects, count:", updates.projects.length);

        try {
          await client.query(
            "UPDATE candidates SET projects = $1 WHERE id = $2",
            [JSON.stringify(updates.projects), candidateId]
          );
          console.log("Updated projects successfully");
        } catch (projErr: any) {
          console.warn("Could not update projects:", projErr.message);
        }
      }

      // Update parsing job record if we have parsed data
      if (updates.skills || updates.work_history || updates.education || updates.certifications || updates.projects) {
        const parsedDataJson = {
          name: updates.full_name || updates.name || existingCandidate.full_name,
          email: updates.email || existingCandidate.email,
          phone: updates.phone || existingCandidate.phone,
          summary: updates.summary,
          skills: updates.skills || [],
          work_history: updates.work_history || [],
          education: updates.education || [],
          certifications: updates.certifications || [],
          projects: updates.projects || [],
        };

        // Update existing parsing job or create new one
        await client.query(
          `INSERT INTO parsing_jobs (id, candidate_id, filename, status, confidence_score, parsed_data, started_at, completed_at) 
           VALUES ($1, $2, $3, 'completed', $4, $5, NOW(), NOW())
           ON CONFLICT (candidate_id) 
           DO UPDATE SET 
             parsed_data = $5,
             completed_at = NOW(),
             status = 'completed'`,
          [
            crypto.randomUUID(),
            candidateId,
            `${existingCandidate.full_name || "candidate"}_update.pdf`,
            0.95, // High confidence for manual updates
            JSON.stringify(parsedDataJson)
          ]
        );

        // Update candidate status to completed
        await client.query("UPDATE candidates SET status = 'success' WHERE id = $1", [candidateId]);
      }

      await client.query("COMMIT");

      // Get updated candidate with all details
      const updatedCandidate = await CandidateModel.findByIdWithDetails(client, candidateId);

      res.json({
        message: "Candidate updated successfully with all related data",
        candidate: updatedCandidate ? mapCandidateWithParsingStatus(updatedCandidate) : null,
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Update candidate error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        code: error.code
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
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
              // Delete existing flat skills (fallback for old schema)
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
            work_history: [],
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
            `INSERT INTO parsing_jobs (id, candidate_id, filename, status, confidence_score, parsed_data, started_at, completed_at) 
             VALUES ($1, $2, $3, 'completed', $4, $5, NOW(), NOW())`,
            [crypto.randomUUID(), candidate.id, "imported_from_csv.pdf", calculatedConfidence, JSON.stringify(parsedDataJson)],
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
      } catch (err) { }
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
        "UPDATE work_history SET candidate_id = $1 WHERE candidate_id = $2",
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
        const primarySkills = await client.query("SELECT LOWER(TRIM(name)) as name FROM skills WHERE candidate_id = $1", [primaryId]);
        const primarySkillNames = primarySkills.rows.map((s: any) => s.name);
        if (primarySkillNames.length > 0) {
          await client.query(
            "DELETE FROM skills WHERE candidate_id = $1 AND LOWER(TRIM(name)) = ANY($2)",
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

/**
 * Import external candidate from LinkedIn, GitHub, etc.
 * Creates a minimal candidate record that can be enriched later.
 */
export const importExternalCandidate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, profile_url, snippet, source, role, skills } = req.body;

    // Validate required fields
    if (!name || !profile_url) {
      res.status(400).json({
        error: "INVALID_INPUT",
        message: "name and profile_url are required",
      });
      return;
    }

    if (!source || !["linkedin_google", "github"].includes(source)) {
      res.status(400).json({
        error: "INVALID_SOURCE",
        message: "source must be either 'linkedin_google' or 'github'",
      });
      return;
    }

    const client = await getClient();

    try {
      await client.query("BEGIN");

      // Generate email hash (required field, use profile_url as basis)
      const emailHash = crypto
        .createHash("md5")
        .update(profile_url)
        .digest("hex");

      // Insert candidate record
      const insertQuery = `
        INSERT INTO candidates (
          id,
          full_name,
          email_hash,
          current_title,
          summary,
          status,
          review_status,
          external_source,
          external_source_url,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          'external_import',
          'pending',
          $5,
          $6,
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      const candidateResult = await client.query(insertQuery, [
        name,
        emailHash,
        role || null,
        snippet || null,
        source,
        profile_url,
      ]);

      const candidate = candidateResult.rows[0];

      // Insert skills if provided
      if (skills && skills.length > 0) {
        for (const skillName of skills) {
          // Check if skill exists in skills table
          const skillCheck = await client.query(
            "SELECT id FROM skills WHERE name = $1",
            [skillName]
          );

          let skillId: string;
          if (skillCheck.rows.length === 0) {
            // Create skill if it doesn't exist
            const normalizedSkill = skillName.toLowerCase().replace(/[^a-z0-9]/g, "");
            const skillInsert = await client.query(
              "INSERT INTO skills (name, normalized_name, category) VALUES ($1, $2, $3) RETURNING id",
              [skillName, normalizedSkill, "technical"]
            );
            skillId = skillInsert.rows[0].id;
          } else {
            skillId = skillCheck.rows[0].id;
          }

          // Link skill to candidate
          await client.query(
            "INSERT INTO candidate_skills (candidate_id, skill_id) VALUES ($1, $2)",
            [candidate.id, skillId]
          );
        }
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "External candidate imported successfully",
        candidate: {
          id: candidate.id,
          full_name: candidate.full_name,
          current_title: candidate.current_title,
          summary: candidate.summary,
          status: candidate.status,
          review_status: candidate.review_status,
          external_source: candidate.external_source,
          external_source_url: candidate.external_source_url,
          created_at: candidate.created_at,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Import external candidate error:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to import external candidate",
      details: error.message,
    });
  }
};

// ── BULLETPROOF HELPER FUNCTIONS ─────────────────────────────────────

// Helper function to normalize date/year strings to YYYY-MM-DD
function normalizeDateString(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Already a full ISO date or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // Just a year like "2020" -> "2020-01-01"
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  // Try parsing other date formats
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

// Helper function to parse grades (needed for education)
function parseGrade(raw: any): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return isFinite(raw) ? Math.min(raw, 9.99) : null;
  }
  const s = String(raw).trim();
  if (!s) return null;
  const slashMatch = s.match(/^(\d+\.?\d*)\s*\/\s*\d+\.?\d*$/);
  if (slashMatch) {
    const n = parseFloat(slashMatch[1]);
    return isFinite(n) ? Math.min(n, 9.99) : null;
  }
  const n = parseFloat(s);
  return isFinite(n) ? Math.min(n, 9.99) : null;
}

async function saveCandidateWithDuplicateHandling(client: any, candidateData: any, warnings: string[]): Promise<any> {
  const userId = candidateData.userId;
  const tenantId = candidateData.tenantId || "default";

  // Check for existing candidate with same email
  if (candidateData.email) {
    const existingCandidate = await client.query(
      "SELECT id, full_name, email FROM candidates WHERE email = $1 AND tenant_id = $2",
      [candidateData.email, tenantId]
    );

    if (existingCandidate.rows.length > 0) {
      warnings.push(`Candidate with email ${candidateData.email} already exists. Updating existing record.`);
      const existing = existingCandidate.rows[0];

      // Update existing candidate with new data
      const updateQuery = `
        UPDATE candidates 
        SET full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone),
            summary = COALESCE($3, summary),
            linkedin_url = COALESCE($4, linkedin_url),
            github_url = COALESCE($5, github_url),
            location = COALESCE($6, location),
            updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        candidateData.full_name || candidateData.name || existing.full_name,
        candidateData.phone || existing.phone,
        candidateData.summary || existing.summary,
        candidateData.linkedin_url || existing.linkedin_url,
        candidateData.github_url || existing.github_url,
        candidateData.location || existing.location,
        existing.id
      ]);

      return result.rows[0];
    }
  }

  // Create new candidate
  const candidate = await CandidateModel.create(client, {
    ...candidateData,
    tenant_id: tenantId,
  });

  return candidate;
}

async function saveSkillsBestEffort(client: any, candidateId: string, skills: any[], warnings: string[]): Promise<void> {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return;

  try {
    console.log("Saving skills (best effort)...");

    // Delete existing skill associations for this candidate
    try {
      await client.query("DELETE FROM candidate_skills WHERE candidate_id = $1", [candidateId]);
    } catch (cleanupErr: any) {
      // candidate_skills table may not exist; ignore
    }
    try {
      await client.query("DELETE FROM skills WHERE candidate_id = $1", [candidateId]);
    } catch (cleanupErr: any) {
      console.warn("Could not delete existing skills:", cleanupErr.message);
    }

    let insertedCount = 0;
    for (const skill of skills) {
      // Handle both string and object formats
      let skillName: string;
      if (typeof skill === "string") {
        skillName = skill;
      } else if (skill && typeof skill === "object") {
        skillName = skill.name || skill.skill_name || skill.title || skill.skill;
      } else {
        console.warn(`Invalid skill format:`, skill);
        continue;
      }

      if (!skillName || typeof skillName !== "string") {
        console.warn(`Invalid skill name:`, skillName);
        continue;
      }

      try {
        // Production schema has UNIQUE on `name` (global catalog) AND `candidate_id` NOT NULL.
        // To satisfy both constraints, generate a unique `name` per candidate while keeping the
        // display value in `skill_name`.
        const displayName = skillName.trim();
        const normalizedName = displayName.toLowerCase();
        const uniqueName = `${normalizedName}_${candidateId.replace(/-/g, '').substring(0, 8)}_${Date.now().toString(36)}`;

        const skillId = crypto.randomUUID();
        await client.query(
          `INSERT INTO skills (id, candidate_id, name, skill_name, category)
           VALUES ($1, $2, $3, $4, $5)`,
          [skillId, candidateId, uniqueName, displayName, 'technical']
        );

        // Also maintain candidate_skills join table for matching/search compatibility
        try {
          await client.query(
            "INSERT INTO candidate_skills (candidate_id, skill_id) VALUES ($1, $2)",
            [candidateId, skillId]
          );
        } catch (joinErr: any) {
          // candidate_skills table may not exist or have constraints; ignore
          console.warn("candidate_skills insert skipped:", joinErr.message);
        }

        insertedCount++;
      } catch (skillErr: any) {
        console.error(`Full skill error for "${skillName}":`, skillErr);
        console.error(`Error code:`, skillErr.code);
        console.error(`Error detail:`, skillErr.detail);
        console.warn(`Failed to save skill "${skillName}":`, skillErr.message);
        warnings.push(`Failed to save skill: ${skillName}`);
      }
    }

    console.log(`Skills saved: ${insertedCount}/${skills.length}`);
  } catch (error: any) {
    console.error("Skills save failed:", error.message);
    warnings.push("Skills save operation failed");
  }
}

async function saveEducationBestEffort(client: any, candidateId: string, education: any[], warnings: string[]): Promise<void> {
  if (!education || !Array.isArray(education) || education.length === 0) return;

  try {
    console.log("Saving education (best effort)...");

    // Delete existing education
    await client.query("DELETE FROM education WHERE candidate_id = $1", [candidateId]);

    let insertedCount = 0;
    for (const edu of education) {
      try {
        const gpa = parseGrade(edu.grade || edu.gpa);
        const startDate = normalizeDateString(edu.start_date || edu.start_year);
        const endDate = normalizeDateString(edu.end_date || edu.end_year);
        await client.query(
          `INSERT INTO education (id, candidate_id, institution, degree, field_of_study, start_date, end_date, gpa)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            crypto.randomUUID(),
            candidateId,
            edu.institution || null,
            edu.degree || null,
            edu.field_of_study || null,
            startDate,
            endDate,
            gpa
          ]
        );
        insertedCount++;
      } catch (eduErr: any) {
        console.error(`Full education error for "${edu.degree}":`, eduErr);
        console.warn(`Failed to save education "${edu.degree}":`, eduErr.message);
        warnings.push(`Failed to save education: ${edu.degree}`);
      }
    }

    console.log(`Education saved: ${insertedCount}/${education.length}`);
  } catch (error: any) {
    console.error("Education save failed:", error.message);
    warnings.push("Education save operation failed");
  }
}

async function saveWorkExperienceBestEffort(client: any, candidateId: string, workHistory: any[], warnings: string[]): Promise<void> {
  if (!workHistory || !Array.isArray(workHistory) || workHistory.length === 0) return;

  try {
    console.log("Saving work experience (best effort)...");

    // Delete existing work experience
    await client.query("DELETE FROM work_history WHERE candidate_id = $1", [candidateId]);

    let insertedCount = 0;
    for (const work of workHistory) {
      try {
        // Use company_name (production schema) instead of company
        const companyName = work.company_name || work.company || null;
        const jobTitle = work.job_title || work.role || work.title || null;
        const isCurrent = work.is_current || work.isCurrent || false;
        const startDate = normalizeDateString(work.start_date || work.startDate || work.start_year || work.startYear);
        const endDate = normalizeDateString(work.end_date || work.endDate || work.end_year || work.endYear || work.graduation_date);

        await client.query(
          `INSERT INTO work_history (id, candidate_id, job_title, company_name, start_date, end_date, is_current, description, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            crypto.randomUUID(),
            candidateId,
            jobTitle,
            companyName,
            startDate,
            endDate,
            isCurrent,
            work.description || null,
            work.location || null
          ]
        );
        insertedCount++;
      } catch (workErr: any) {
        console.error(`Full work error for "${work.job_title}":`, workErr);
        console.warn(`Failed to save work experience "${work.job_title}":`, workErr.message);
        warnings.push(`Failed to save work experience: ${work.job_title || work.company || 'Unknown'}`);
      }
    }

    console.log(`Work experience saved: ${insertedCount}/${workHistory.length}`);
  } catch (error: any) {
    console.error("Work experience save failed:", error.message);
    warnings.push("Work experience save operation failed");
  }
}

async function saveCertificationsBestEffort(client: any, candidateId: string, certifications: any[], warnings: string[]): Promise<void> {
  if (!certifications || !Array.isArray(certifications) || certifications.length === 0) return;

  try {
    console.log("Saving certifications (best effort)...");

    // Delete existing certifications
    await client.query("DELETE FROM certifications WHERE candidate_id = $1", [candidateId]);

    let insertedCount = 0;
    for (const cert of certifications) {
      try {
        // Truncate certification name if too long
        const certName = String(cert.name || cert).substring(0, 255);
        await client.query(
          "INSERT INTO certifications (id, candidate_id, name) VALUES ($1, $2, $3)",
          [crypto.randomUUID(), candidateId, certName.trim()]
        );
        insertedCount++;
      } catch (certErr: any) {
        console.warn(`Failed to save certification "${cert}":`, certErr.message);
        warnings.push(`Failed to save certification: ${cert}`);
      }
    }

    console.log(`Certifications saved: ${insertedCount}/${certifications.length}`);
  } catch (error: any) {
    console.error("Certifications save failed:", error.message);
    warnings.push("Certifications save operation failed");
  }
}

async function saveProjectsBestEffort(client: any, candidateId: string, projects: any[], warnings: string[]): Promise<void> {
  if (!projects || !Array.isArray(projects) || projects.length === 0) return;

  try {
    console.log("Saving projects (best effort)...");

    // Update candidate projects as JSON
    await client.query(
      "UPDATE candidates SET projects = $1 WHERE id = $2",
      [JSON.stringify(projects), candidateId]
    );

    console.log(`Projects saved: ${projects.length}`);
  } catch (error: any) {
    console.error("Projects save failed:", error.message);
    warnings.push("Projects save operation failed");
  }
}

async function saveActivityLogBestEffort(client: any, candidateId: string, candidateData: any, warnings: string[]): Promise<void> {
  const userId = candidateData.userId;

  if (!userId) {
    warnings.push("Activity log skipped: No user ID provided");
    return;
  }

  try {
    // Check if user exists
    const userExists = await client.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userExists.rows.length === 0) {
      warnings.push("Activity log skipped: User does not exist in database");
      return;
    }

    await client.query(
      `INSERT INTO activity_log (action, entity_id, entity_type, user_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      ['candidate_created', candidateId, 'candidate', userId]
    );

    console.log("Activity log saved");
  } catch (error: any) {
    console.error("Activity log save failed:", error.message);
    warnings.push("Activity log save failed");
  }
}

async function saveParsingDataBestEffort(client: any, candidateId: string, candidateData: any, warnings: string[]): Promise<void> {
  try {
    console.log("Saving parsing data (best effort)...");

    const parsedDataJson = {
      name: candidateData.full_name || candidateData.name,
      email: candidateData.email,
      phone: candidateData.phone,
      summary: candidateData.summary,
      skills: candidateData.skills || [],
      work_history: candidateData.work_history || [],
      education: candidateData.education || [],
      certifications: candidateData.certifications || [],
      projects: candidateData.projects || [],
    };

    const filename = `${candidateData.full_name || "candidate"}_manual_entry.pdf`;

    // Calculate confidence score
    let calculatedConfidence = 0.0;
    if (candidateData.work_history && candidateData.work_history.length > 0) calculatedConfidence += 0.35;
    if (candidateData.education && candidateData.education.length > 0) calculatedConfidence += 0.25;
    if (candidateData.skills && candidateData.skills.length > 0) calculatedConfidence += 0.20;
    if (candidateData.summary && candidateData.summary.length > 0) calculatedConfidence += 0.10;
    if (candidateData.email || candidateData.phone) calculatedConfidence += 0.10;

    calculatedConfidence = Math.min(calculatedConfidence, 0.98);
    const confidenceToSave = candidateData.confidence_score !== undefined
      ? candidateData.confidence_score
      : (calculatedConfidence || 0.85);

    // Validate confidence score is within allowed range (0-1)
    const validatedConfidence = Math.min(Math.max(confidenceToSave, 0), 1);

    await client.query(
      `INSERT INTO parsing_jobs (id, candidate_id, filename, status, confidence_score, parsed_data, started_at, completed_at)
       VALUES ($1, $2, $3, 'completed', $4, $5, NOW(), NOW())`,
      [crypto.randomUUID(), candidateId, filename, validatedConfidence, JSON.stringify(parsedDataJson)]
    );

    // Update candidate status to success
    await client.query("UPDATE candidates SET status = 'success' WHERE id = $1", [candidateId]);

    console.log("Parsing data saved successfully");
  } catch (error: any) {
    console.error("Parsing data save failed:", error.message);
    warnings.push("Parsing data save failed");
  }
}

/**
 * Save application progress for a candidate
 */
export const saveApplicationProgress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { application_data, last_updated } = req.body;

    console.log("🔍 [DEBUG] saveApplicationProgress called");
    console.log("🔍 [DEBUG] candidateId:", id);
    console.log("🔍 [DEBUG] request body:", req.body);
    console.log("🔍 [DEBUG] application_data:", application_data);
    console.log("🔍 [DEBUG] last_updated:", last_updated);

    if (!application_data) {
      console.log("❌ [ERROR] Application data is required");
      res.status(400).json({ error: "Application data is required" });
      return;
    }

    console.log("🔍 [DEBUG] Checking if candidate exists...");
    // Check if candidate exists
    const candidateCheck = await query(
      "SELECT id FROM candidates WHERE id = $1",
      [id]
    );

    console.log("🔍 [DEBUG] Candidate check result:", candidateCheck.rows);

    if (candidateCheck.rows.length === 0) {
      console.log("❌ [ERROR] Candidate not found:", id);
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    console.log("🔍 [DEBUG] Candidate exists, proceeding to save progress...");
    console.log("🔍 [DEBUG] Payload for database:", {
      candidate_id: id,
      application_data: JSON.stringify(application_data),
      last_updated: last_updated || new Date().toISOString()
    });

    // Insert or update application progress
    const result = await query(
      `INSERT INTO application_progress (candidate_id, application_data, last_updated)
       VALUES ($1, $2, $3)
       ON CONFLICT (candidate_id) 
       DO UPDATE SET 
         application_data = EXCLUDED.application_data,
         last_updated = EXCLUDED.last_updated
       RETURNING *`,
      [id, JSON.stringify(application_data), last_updated || new Date().toISOString()]
    );

    console.log("✅ [SUCCESS] Application progress saved successfully");
    console.log("🔍 [DEBUG] Database result:", result.rows[0]);

    res.status(200).json({
      message: "Application progress saved successfully",
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error("❌ [ERROR] Save application progress error:", error);
    console.error("❌ [ERROR] Full error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint
    });

    // Return actual error details in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      res.status(500).json({ 
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        constraint: error.constraint
      });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

/**
 * Load application progress for a candidate
 */
export const loadApplicationProgress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    console.log("🔍 [DEBUG] loadApplicationProgress called");
    console.log("🔍 [DEBUG] candidateId:", id);

    console.log("🔍 [DEBUG] Checking if candidate exists...");
    // Check if candidate exists
    const candidateCheck = await query(
      "SELECT id FROM candidates WHERE id = $1",
      [id]
    );

    console.log("🔍 [DEBUG] Candidate check result:", candidateCheck.rows);

    if (candidateCheck.rows.length === 0) {
      console.log("❌ [ERROR] Candidate not found:", id);
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    console.log("🔍 [DEBUG] Candidate exists, getting application progress...");
    // Get application progress
    const result = await query(
      "SELECT application_data, last_updated FROM application_progress WHERE candidate_id = $1",
      [id]
    );

    console.log("🔍 [DEBUG] Application progress query result:", result.rows);

    if (result.rows.length === 0) {
      console.log("ℹ️ [INFO] No application progress found for candidate:", id);
      res.status(200).json({
        application_data: null,
        last_updated: null
      });
      return;
    }

    console.log("✅ [SUCCESS] Application progress loaded successfully");
    console.log("🔍 [DEBUG] Returning data:", {
      application_data: result.rows[0].application_data,
      last_updated: result.rows[0].last_updated
    });

    res.status(200).json({
      application_data: result.rows[0].application_data,
      last_updated: result.rows[0].last_updated
    });
  } catch (error: any) {
    console.error("❌ [ERROR] Load application progress error:", error);
    console.error("❌ [ERROR] Full error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint
    });

    // Return actual error details in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      res.status(500).json({ 
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        constraint: error.constraint
      });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};


