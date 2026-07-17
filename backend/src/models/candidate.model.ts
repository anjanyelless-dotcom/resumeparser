import { Pool } from "pg";
import { getClient } from "../database/db";
import crypto from "crypto";

export interface Candidate {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  full_name?: string;
  status?: string;
  resume_path?: string;

  consent_given?: boolean;
  tenant_id?: string;
  review_status?: string;
  email_hash?: string;
  match_score?: number;
  created_at?: Date;
  updated_at?: Date;
  summary?: string;
  raw_resume_text?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  location?: string;
  total_experience_years?: number;
  created_by_user_id?: string;
}

export interface CandidateWithDetails extends Candidate {
  work_history?: any[];
  education?: any[];
  certifications?: any[];
  projects?: any[];
  skills?: any[];
}

export class CandidateModel {
  static async findById(id: string): Promise<CandidateWithDetails | null> {
    const client = await getClient();
    try {
      const result = await client.query(
        "SELECT * FROM candidates WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async findByIdWithDetails(client: any, id: string): Promise<CandidateWithDetails | null> {
    try {
      // Get candidate
      const candidateResult = await client.query(
        "SELECT * FROM candidates WHERE id = $1",
        [id]
      );
      
      if (candidateResult.rows.length === 0) {
        return null;
      }
      
      const candidate = candidateResult.rows[0];
      
      // Get work experience
      const workExperienceResult = await client.query(
        "SELECT * FROM work_history WHERE candidate_id = $1 ORDER BY start_date DESC",
        [id]
      );
      
      // Get education
      const educationResult = await client.query(
        "SELECT * FROM education WHERE candidate_id = $1 ORDER BY end_date DESC",
        [id]
      );
      
      // Get certifications (graceful fallback if table doesn't exist yet)
      let certificationRows: any[] = [];
      try {
        const certificationsResult = await client.query(
          "SELECT * FROM certifications WHERE candidate_id = $1 ORDER BY created_at DESC",
          [id]
        );
        certificationRows = certificationsResult.rows;
      } catch (certErr: any) {
        // Table may not exist yet — return empty array
        console.warn("certifications table not found, returning empty array:", certErr.message);
      }

      // Get skills via candidate_skills join table
      let skillRows: any[] = [];
      try {
        const skillsResult = await client.query(
          `SELECT s.id, s.name as skill_name, s.normalized_name, s.category,
                  cs.proficiency_level, cs.years_experience, cs.is_primary, cs.mention_count
           FROM skills s
           JOIN candidate_skills cs ON cs.skill_id = s.id
           WHERE cs.candidate_id = $1
           ORDER BY s.name`,
          [id]
        );
        console.log("Skills query result for candidate", id, ":", skillsResult.rows.length, "skills found");
        skillRows = skillsResult.rows;
      } catch (skillErr: any) {
        console.warn("skills query failed:", skillErr.message);
      }

      // Get projects from candidates.projects JSONB column (graceful fallback)
      let projectRows: any[] = [];
      try {
        if (candidate.projects) {
          projectRows = Array.isArray(candidate.projects) ? candidate.projects : JSON.parse(candidate.projects);
        }
      } catch (projErr) {
        projectRows = [];
      }

      // Get latest parsing job
      const parsingJobResult = await client.query(
        "SELECT status, confidence_score, error_message, completed_at, parsed_data FROM parsing_jobs WHERE candidate_id = $1 ORDER BY started_at DESC LIMIT 1",
        [id]
      );
      const parsingJob = parsingJobResult.rows[0] || null;

      // Safe fallback for raw_resume_text
      let safeRawText = candidate.raw_resume_text || null;
      if (!safeRawText && parsingJob && parsingJob.parsed_data) {
        try {
          const pd = typeof parsingJob.parsed_data === 'string' ? JSON.parse(parsingJob.parsed_data) : parsingJob.parsed_data;
          safeRawText = pd.raw_text || pd.full_text || pd.raw_resume_text || "";
        } catch (e) {
          // ignore JSON parse error
        }
      }

      return {
        ...candidate,
        raw_resume_text: safeRawText,
        pj_status: parsingJob?.status || null,
        pj_confidence_score: parsingJob?.confidence_score || null,
        pj_error_message: parsingJob?.error_message || null,
        work_history: workExperienceResult.rows,
        education: educationResult.rows,
        certifications: certificationRows,
        projects: projectRows,
        skills: skillRows
      };
      console.log("Returning candidate with", skillRows.length, "skills");
    } catch (error) {
      console.error("Error fetching candidate with details:", error);
      throw error;
    }
  }

  static async create(client: any, data: Partial<Candidate>): Promise<Candidate> {
    const id = data.id || crypto.randomUUID();

    // Validate status field - only allow valid enum values
    const validStatuses = ['pending', 'processing', 'success', 'failed', 'deleted'];
    const status = data.status && validStatuses.includes(data.status) ? data.status : 'pending';
      
    const result = await client.query(
      `INSERT INTO candidates (
        id, email, phone, full_name, status, summary,
        review_status,
        linkedin_url, github_url, location,
        tenant_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *`,
      [
        id,
        data.email || null,
        data.phone || null,
        data.full_name || data.name || null,
        status,
        data.summary || null,
        data.review_status || "pending",
        data.linkedin_url || null,
        data.github_url || null,
        data.location || null,
        data.tenant_id || "default"
      ]
    );
    return result.rows[0];
  }

  static async update(client: any, id: string, data: Partial<Candidate>): Promise<Candidate | null> {
    // Validate status field - only allow valid enum values
    const validStatuses = ['pending', 'processing', 'success', 'failed', 'deleted'];
    const status = data.status && validStatuses.includes(data.status) ? data.status : null;

    const result = await client.query(
      `UPDATE candidates 
       SET email = COALESCE($1, email), 
           phone = COALESCE($2, phone), 
           full_name = COALESCE($3, full_name), 
           status = COALESCE($4, status), 
           summary = COALESCE($5, summary), 
           raw_resume_text = COALESCE($6, raw_resume_text),
           linkedin_url = COALESCE($7, linkedin_url),
           github_url = COALESCE($8, github_url),
           location = COALESCE($9, location),
           updated_at = NOW() 
       WHERE id = $10 
       RETURNING *`,
      [
        data.email,
        data.phone,
        data.full_name || data.name,
        status,
        data.summary,
        data.raw_resume_text,
        data.linkedin_url,
        data.github_url,
        data.location,
        id
      ]
    );
    return result.rows[0] || null;
  }

  static async softDelete(client: any, id: string): Promise<boolean> {
    const result = await client.query(
      "UPDATE candidates SET deleted_at = NOW(), status = 'deleted' WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rowCount > 0;
  }

  static async getParsingStatus(client: any, candidateId: string): Promise<any | null> {
    const result = await client.query(
      "SELECT * FROM parsing_jobs WHERE candidate_id = $1 ORDER BY started_at DESC LIMIT 1",
      [candidateId]
    );
    return result.rows[0] || null;
  }

  static async findAll(
    client: any,
    page: number = 1,
    limit: number = 20,
    search?: string,
    company?: string,
    jobTitle?: string,
    certification?: string,
    salaryMin?: number,
    salaryMax?: number,
    myCandidates?: string
  ): Promise<{ candidates: CandidateWithDetails[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Build WHERE clause for search
      let whereClause = "WHERE candidates.status IN ('success', 'pending', 'processing', 'failed')";
      const queryParams: any[] = [];
      let joinClause = "";
      
      if (search) {
        queryParams.push(`%${search}%`);
        whereClause += ` AND (
          candidates.full_name ILIKE $${queryParams.length}
          OR candidates.email ILIKE $${queryParams.length}
          OR EXISTS (
            SELECT 1 FROM candidate_skills cs
            JOIN skills s ON s.id = cs.skill_id
            WHERE cs.candidate_id = candidates.id AND s.name ILIKE $${queryParams.length}
          )
        )`;
      }
      
      // Add company filter (join with work_history)
      if (company) {
        queryParams.push(`%${company}%`);
        joinClause += " JOIN work_history we ON candidates.id = we.candidate_id";
        whereClause += ` AND we.company_name ILIKE $${queryParams.length}`;
      }
      
      // Add job_title filter (join with work_history)
      if (jobTitle) {
        queryParams.push(`%${jobTitle}%`);
        if (!joinClause) {
          joinClause += " JOIN work_history we ON candidates.id = we.candidate_id";
        }
        whereClause += ` AND we.job_title ILIKE $${queryParams.length}`;
      }
      
      // Add certification filter (join with certifications)
      if (certification) {
        queryParams.push(`%${certification}%`);
        joinClause += " JOIN certifications cert ON candidates.id = cert.candidate_id";
        whereClause += ` AND cert.name ILIKE $${queryParams.length}`;
      }
      
      // Add salary range filter
      if (salaryMin !== undefined) {
        queryParams.push(salaryMin);
        whereClause += ` AND expected_salary_min >= $${queryParams.length}`;
      }
      if (salaryMax !== undefined) {
        queryParams.push(salaryMax);
        whereClause += ` AND expected_salary_max <= $${queryParams.length}`;
      }
      
      // Add myCandidates filter - DISABLED until candidates table has created_by_user_id column
      // if (myCandidates) {
      //   queryParams.push(myCandidates);
      //   whereClause += ` AND created_by_user_id = $${queryParams.length}`;
      // }
      
      // Get total count
      const countQuery = `SELECT COUNT(DISTINCT candidates.id) FROM candidates ${joinClause} ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated candidates with latest parsing job status
      queryParams.push(limit, offset);
      const candidatesQuery = `
        SELECT DISTINCT candidates.*,
               pj.status as pj_status,
               pj.confidence_score as pj_confidence_score,
               pj.error_message as pj_error_message,
               pj.completed_at as pj_completed_at
        FROM candidates 
        LEFT JOIN LATERAL (
            SELECT DISTINCT ON (candidate_id) candidate_id, status, confidence_score, error_message, completed_at, started_at
            FROM parsing_jobs
            WHERE parsing_jobs.candidate_id = candidates.id
            ORDER BY candidate_id, started_at DESC
            LIMIT 1
        ) pj ON true
        ${joinClause}
        ${whereClause}
        ORDER BY candidates.created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;
      
      const candidatesResult = await client.query(candidatesQuery, queryParams);
      const candidates = candidatesResult.rows;
      
      if (candidates.length === 0) {
        return {
          candidates: [],
          total
        };
      }
      
      const candidateIds = candidates.map((c: any) => c.id);
      
      // Batch fetch work history
      const workHistoryResult = await client.query(
        "SELECT * FROM work_history WHERE candidate_id = ANY($1) ORDER BY start_date DESC",
        [candidateIds]
      );
      
      // Batch fetch education
      const educationResult = await client.query(
        "SELECT * FROM education WHERE candidate_id = ANY($1) ORDER BY start_date DESC",
        [candidateIds]
      );
      
      // Batch fetch skills via candidate_skills join table
      let skillRows: any[] = [];
      try {
        const skillsResult = await client.query(
          `SELECT cs.candidate_id, s.id, s.name as skill_name, s.normalized_name, s.category,
                  cs.proficiency_level, cs.years_experience, cs.is_primary, cs.mention_count
           FROM skills s
           JOIN candidate_skills cs ON cs.skill_id = s.id
           WHERE cs.candidate_id = ANY($1)
           ORDER BY cs.candidate_id, s.name`,
          [candidateIds]
        );  
        console.log("Skills query result for list API:", skillsResult.rows.length, "skills found for", candidateIds.length, "candidates");
        skillRows = skillsResult.rows;
      } catch (skillErr: any) {
        console.warn("Failed to fetch skills in candidate list:", skillErr.message, skillErr.detail, skillErr.code);
      }
      
      // Map work history, education, and skills back to candidate rows
      const candidatesWithDetails = candidates.map((candidate: any) => {
        const candidateWork = workHistoryResult.rows.filter((w: any) => w.candidate_id === candidate.id);
        const candidateEducation = educationResult.rows.filter((e: any) => e.candidate_id === candidate.id);
        const candidateSkills = skillRows.filter((s: any) => s.candidate_id === candidate.id);
        const result = {
          ...candidate,
          work_history: candidateWork,
          education: candidateEducation,
          skills: candidateSkills
        };
        console.log("Candidate", candidate.id, "has", candidateSkills.length, "skills");
        return result;
      });
      
      return {
        candidates: candidatesWithDetails,
        total
      };
    } catch (error) {
      console.error("Error fetching candidates:", error);
      throw error;
    }
  }
}
