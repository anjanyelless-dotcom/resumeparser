import { Request, Response } from "express";
import { getClient } from "../database/db";
import { callAIService } from "../services/aiService";
import { extractJD } from "../services/jd-extractor.service";
import { rankCandidates, CandidateData } from "../services/ats-engine.service";

/**
 * Controller for handling candidate-job matching operations
 */

export const matchCandidatesToJob = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { limit = 20 } = req.body;

    const client = await getClient();

    try {
      // 1. Get job from database by jobId
      const jobQuery = `
        SELECT j.*, 
               array_agg(DISTINCT js.skill_name) as required_skills,
               array_agg(DISTINCT ps.skill_name) as preferred_skills
        FROM job_descriptions j
        LEFT JOIN job_skills js ON j.id = js.job_id AND js.skill_type = 'required'
        LEFT JOIN job_skills ps ON j.id = ps.job_id AND ps.skill_type = 'preferred'
        WHERE j.id = $1
        GROUP BY j.id
      `;

      const jobResult = await client.query(jobQuery, [jobId]);

      if (jobResult.rows.length === 0) {
        res.status(404).json({
          error: "JOB_NOT_FOUND",
          message: `Job with ID ${jobId} not found`,
        });
        return;
      }

      const job = jobResult.rows[0];

      // 2. Get all candidates from database
      const candidatesQuery = `
        SELECT c.*, 
               (
                 SELECT array_agg(DISTINCT s.name)
                 FROM candidate_skills cs
                 JOIN skills s ON cs.skill_id = s.id
                 WHERE cs.candidate_id = c.id
               ) as skills,
               (
                 SELECT json_agg(we.*)
                 FROM work_history we
                 WHERE we.candidate_id = c.id
               ) as work_experience,
               (
                 SELECT json_agg(ed.*)
                 FROM education ed
                 WHERE ed.candidate_id = c.id
               ) as education,
               c.years_of_experience
        FROM candidates c
        ORDER BY c.created_at DESC
        LIMIT $1
      `;

      const candidatesResult = await client.query(candidatesQuery, [limit]);
      const candidates = candidatesResult.rows;

      if (candidates.length === 0) {
        res.json({
          success: true,
          jobId,
          message: "No candidates found",
          matches: [],
        });
        return;
      }

      // 3. Prepare batch match request
      const candidatesData = candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        linkedin: candidate.linkedin_url,
        github: candidate.github_url,
        skills: candidate.skills || [],
        years_of_experience: candidate.years_of_experience || undefined,
        work_experience: candidate.work_experience && candidate.work_experience[0] !== null ? candidate.work_experience : [],
        education: candidate.education || [],
        parsed_data: candidate.parsed_data || null,
      }));

      const jobData = {
        id: job.id,
        title: job.title,
        description: job.description,
        required_skills: (job.required_skills || []).filter(Boolean),
        preferred_skills: (job.preferred_skills || []).filter(Boolean),
        min_experience_years: job.min_experience_years,
        max_experience_years: job.max_experience_years,
        education_requirement: job.education_requirement,
        employment_type: job.employment_type,
        seniority_level: job.seniority_level,
      };

      let matches: any[] = [];
      try {
        console.log(`🤖 Requesting batch match for ${candidates.length} candidates from AI service`);
        const batchResponse = await callAIService("/match-batch", {
          candidates_data: candidatesData,
          job_data: jobData,
        });

        // Map the results back to the expected structure
        matches = batchResponse.results.map((matchResult: any) => {
          const candidate = candidates.find((c) => c.id === matchResult.candidate_id);
          return {
            candidate_id: matchResult.candidate_id,
            candidate_name: candidate?.full_name || "",
            candidate_email: candidate?.email || "",
            candidate_location: candidate?.location || "",
            ...matchResult,
          };
        });
      } catch (batchError) {
        console.error("Error calling batch matching API, falling back to individual calls:", batchError);
        // Fallback to individual calls if batch fails
        const matchPromises = candidates.map(async (candidate) => {
          try {
            const matchResult = await callAIService("/match", {
              candidate_data: candidatesData.find((c) => c.id === candidate.id),
              job_data: jobData,
            });
            return {
              candidate_id: candidate.id,
              candidate_name: candidate.full_name,
              candidate_email: candidate.email,
              candidate_location: candidate.location,
              ...matchResult,
            };
          } catch (individualError) {
            console.error(`Error matching candidate ${candidate.id}:`, individualError);
            return {
              candidate_id: candidate.id,
              candidate_name: candidate.full_name,
              candidate_email: candidate.email,
              candidate_location: candidate.location,
              overall_score: 0,
              skill_score: 0,
              experience_score: 0,
              education_score: 0,
              matching_skills: [],
              missing_skills: [],
              extra_skills: [],
              experience_gap_years: 0,
              recommendation: "Not Recommended",
              reason: "Matching service unavailable",
              error: true,
            };
          }
        });
        matches = await Promise.all(matchPromises);
      }

      // 4. Sort candidates by overall_score descending
      const sortedMatches = matches.sort(
        (a, b) => b.overall_score - a.overall_score,
      );

      // 5. Save scores to match_scores table
      const deleteOldScoresQuery = "DELETE FROM match_scores WHERE job_id = $1";
      await client.query(deleteOldScoresQuery, [jobId]);

      const insertScoreQuery = `
        INSERT INTO match_scores (
          job_id, candidate_id, overall_score, skill_score, 
          experience_score, education_score, matching_skills, 
          missing_skills, extra_skills, experience_gap_years, 
          recommendation, reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `;

      for (const match of sortedMatches) {
        if (!match.error) {
          await client.query(insertScoreQuery, [
            jobId,
            match.candidate_id,
            match.overall_score,
            match.skill_score,
            match.experience_score,
            match.education_score,
            match.matching_skills || [],
            match.missing_skills || [],
            match.extra_skills || [],
            match.experience_gap_years,
            match.recommendation,
            match.reason,
          ]);

          // Update candidate record's match_score column (scaled to 0-1)
          await client.query(
            "UPDATE candidates SET match_score = $1, updated_at = NOW() WHERE id = $2",
            [match.overall_score / 100.0, match.candidate_id]
          );
        }
      }

      // 6. Return ranked list of candidates with scores
      res.json({
        success: true,
        jobId,
        job_title: job.title,
        total_candidates: candidates.length,
        successful_matches: sortedMatches.filter((m) => !m.error).length,
        matches: sortedMatches,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in matchCandidatesToJob:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to match candidates to job",
    });
  }
};

export const getAllMatchResults = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const client = await getClient();

    try {
      // Get all cached match scores from match_scores table
      const query = `
        SELECT ms.*, 
               c.full_name as candidate_name,
               c.email as candidate_email,
               c.phone as candidate_phone,
               c.location as candidate_location,
               c.linkedin_url as candidate_linkedin,
               c.github_url as candidate_github,
               j.title as job_title
        FROM match_scores ms
        JOIN candidates c ON ms.candidate_id = c.id
        JOIN job_descriptions j ON ms.job_id = j.id
        ORDER BY ms.overall_score DESC
      `;

      const result = await client.query(query);

      if (result.rows.length === 0) {
        res.json({ matches: [] });
        return;
      }

      // Map match results safely
      const matches = result.rows.map((row) => ({
        ...row,
        matching_skills: row.matching_skills || [],
        missing_skills: row.missing_skills || [],
        extra_skills: row.extra_skills || [],
      }));

      res.json({ matches });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getAllMatchResults:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to get match results",
    });
  }
};

export const getMatchResultsForJob = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { jobId } = req.params;

    // Handle special case for "all"
    if (jobId === "all") {
      res.status(400).json({
        error: "INVALID_JOB_ID",
        message: 'Please provide a valid job ID instead of "all"',
      });
      return;
    }

    const client = await getClient();

    try {
      // Get cached match scores from match_scores table
      const query = `
        SELECT ms.*, 
               c.full_name as candidate_name,
               c.email as candidate_email,
               c.phone as candidate_phone,
               c.location as candidate_location,
               c.linkedin_url as candidate_linkedin,
               c.github_url as candidate_github,
               j.title as job_title
        FROM match_scores ms
        JOIN candidates c ON ms.candidate_id = c.id
        JOIN job_descriptions j ON ms.job_id = j.id
        WHERE ms.job_id = $1
        ORDER BY ms.overall_score DESC
      `;

      const result = await client.query(query, [jobId]);

      if (result.rows.length === 0) {
        res.json({
          success: true,
          jobId,
          total_matches: 0,
          matches: [],
        });
        return;
      }

      // Map matching skills correctly
      const matches = result.rows.map((row) => ({
        ...row,
        matching_skills: row.matching_skills || [],
        missing_skills: row.missing_skills || [],
        extra_skills: row.extra_skills || [],
      }));

      res.json({
        success: true,
        jobId,
        job_title: result.rows[0].job_title,
        total_matches: matches.length,
        matches,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getMatchResultsForJob:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to get match results",
    });
  }
};

export const matchSingleCandidate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { candidateId, jobId } = req.params;

    const client = await getClient();

    try {
      // Get candidate details
      const candidateQuery = `
        SELECT c.*, 
               (
                 SELECT array_agg(DISTINCT s.name)
                 FROM candidate_skills cs
                 JOIN skills s ON cs.skill_id = s.id
                 WHERE cs.candidate_id = c.id
               ) as skills,
               (
                 SELECT json_agg(we.*)
                 FROM work_history we
                 WHERE we.candidate_id = c.id
               ) as work_experience,
               (
                 SELECT json_agg(ed.*)
                 FROM education ed
                 WHERE ed.candidate_id = c.id
               ) as education,
               c.years_of_experience
        FROM candidates c
        WHERE c.id = $1
      `;

      const candidateResult = await client.query(candidateQuery, [candidateId]);

      if (candidateResult.rows.length === 0) {
        res.status(404).json({
          error: "CANDIDATE_NOT_FOUND",
          message: `Candidate with ID ${candidateId} not found`,
        });
        return;
      }

      const candidate = candidateResult.rows[0];

      // Get job details
      const jobQuery = `
        SELECT j.*, 
               array_agg(DISTINCT js.skill_name) as required_skills,
               array_agg(DISTINCT ps.skill_name) as preferred_skills
        FROM job_descriptions j
        LEFT JOIN job_skills js ON j.id = js.job_id AND js.skill_type = 'required'
        LEFT JOIN job_skills ps ON j.id = ps.job_id AND ps.skill_type = 'preferred'
        WHERE j.id = $1
        GROUP BY j.id
      `;

      const jobResult = await client.query(jobQuery, [jobId]);

      if (jobResult.rows.length === 0) {
        res.status(404).json({
          error: "JOB_NOT_FOUND",
          message: `Job with ID ${jobId} not found`,
        });
        return;
      }

      const job = jobResult.rows[0];

      // Prepare data for AI service
      const matchData = {
        candidate_data: {
          id: candidate.id,
          name: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.location,
          linkedin: candidate.linkedin_url,
          github: candidate.github_url,
          skills: candidate.skills || [],
          years_of_experience: candidate.years_of_experience || undefined,
          work_experience: candidate.work_experience && candidate.work_experience[0] !== null ? candidate.work_experience : [],
          education: candidate.education || [],
        },
        job_data: {
          id: job.id,
          title: job.title,
          description: job.description,
          required_skills: (job.required_skills || []).filter(Boolean),
          preferred_skills: (job.preferred_skills || []).filter(Boolean),
          min_experience_years: job.min_experience_years,
          max_experience_years: job.max_experience_years,
          education_requirement: job.education_requirement,
          employment_type: job.employment_type,
          seniority_level: job.seniority_level,
        },
      };

      // Call AI service for matching
      const matchResult = await callAIService("/match", matchData);

      // Save single match result
      const insertScoreQuery = `
        INSERT INTO match_scores (
          job_id, candidate_id, overall_score, skill_score, 
          experience_score, education_score, matching_skills, 
          missing_skills, extra_skills, experience_gap_years, 
          recommendation, reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (job_id, candidate_id) 
        DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          skill_score = EXCLUDED.skill_score,
          experience_score = EXCLUDED.experience_score,
          education_score = EXCLUDED.education_score,
          matching_skills = EXCLUDED.matching_skills,
          missing_skills = EXCLUDED.missing_skills,
          extra_skills = EXCLUDED.extra_skills,
          experience_gap_years = EXCLUDED.experience_gap_years,
          recommendation = EXCLUDED.recommendation,
          reason = EXCLUDED.reason,
          created_at = NOW()
      `;

      await client.query(insertScoreQuery, [
        jobId,
        candidateId,
        matchResult.overall_score,
        matchResult.skill_score,
        matchResult.experience_score,
        matchResult.education_score,
        matchResult.matching_skills || [],
        matchResult.missing_skills || [],
        matchResult.extra_skills || [],
        matchResult.experience_gap_years,
        matchResult.recommendation,
        matchResult.reason,
      ]);

      // Update candidate record's match_score column (scaled to 0-1)
      await client.query(
        "UPDATE candidates SET match_score = $1, updated_at = NOW() WHERE id = $2",
        [matchResult.overall_score / 100.0, candidateId]
      );

      res.json({
        success: true,
        candidate: {
          id: candidate.id,
          name: candidate.full_name,
          email: candidate.email,
          location: candidate.location,
        },
        job: {
          id: job.id,
          title: job.title,
        },
        match_result: matchResult,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in matchSingleCandidate:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to match candidate to job",
    });
  }
};

/**
 * POST /api/matching/jd/parse
 * Parse a raw Job Description text and rank ALL candidates by ATS score.
 * Uses local TypeScript logic only — NO external AI APIs.
 */
export const parseJDAndMatch = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { jd_text } = req.body as { jd_text: string };

    if (!jd_text || typeof jd_text !== "string" || jd_text.trim().length < 20) {
      res.status(400).json({
        error: "INVALID_JD",
        message: "Please provide a valid Job Description text (minimum 20 characters).",
      });
      return;
    }

    // 1. Extract skills / keywords from JD (local NLP)
    const extractedJD = extractJD(jd_text);
    console.log(
      `🔍 JD Extraction: ${extractedJD.skills.length} skills, ${extractedJD.experienceYears}y exp, ${extractedJD.roleKeywords.length} role keywords`
    );

    const client = await getClient();
    try {
      // 2. Fetch ALL candidates with their complete parsed resume data
      const candidatesQuery = `
        SELECT
          c.id,
          c.full_name,
          c.email,
          c.phone,
          c.location,
          c.summary,
          c.raw_resume_text,
          c.years_of_experience,
          c.projects,
          -- Skills array
          (
            SELECT array_agg(DISTINCT s.name)
            FROM skills s
            WHERE s.candidate_id = c.id
              AND s.name IS NOT NULL
          ) AS skills,
          -- Work history
          (
            SELECT json_agg(
              json_build_object(
                'job_title', wh.job_title,
                'company_name', wh.company_name,
                'start_date', wh.start_date,
                'end_date', wh.end_date,
                'is_current', wh.is_current,
                'description', wh.description
              )
            )
            FROM work_history wh
            WHERE wh.candidate_id = c.id
          ) AS work_history,
          -- Education
          (
            SELECT json_agg(
              json_build_object(
                'degree', ed.degree,
                'institution', ed.institution,
                'field_of_study', ed.field_of_study
              )
            )
            FROM education ed
            WHERE ed.candidate_id = c.id
          ) AS education,
          -- Certifications
          (
            SELECT array_agg(DISTINCT cert.name)
            FROM certifications cert
            WHERE cert.candidate_id = c.id
              AND cert.name IS NOT NULL
          ) AS certifications,
          -- Latest parsed data (skills, summary, projects from AI parser)
          (
            SELECT pj.parsed_data
            FROM parsing_jobs pj
            WHERE pj.candidate_id = c.id
              AND pj.status = 'completed'
            ORDER BY pj.completed_at DESC
            LIMIT 1
          ) AS parsed_data
        FROM candidates c
        WHERE c.status NOT IN ('deleted')
          AND c.full_name IS NOT NULL
        ORDER BY c.created_at DESC
      `;

      const result = await client.query(candidatesQuery);

      if (result.rows.length === 0) {
        res.json({
          success: true,
          extracted_skills: extractedJD.skills,
          experience_required: extractedJD.experienceYears,
          total_candidates: 0,
          matches: [],
        });
        return;
      }

      // 3. Map DB rows to CandidateData shape expected by the ATS engine
      const candidates: CandidateData[] = result.rows.map((row) => ({
        id: row.id,
        full_name: row.full_name || "Unknown",
        email: row.email || "",
        phone: row.phone,
        location: row.location,
        summary: row.summary,
        raw_resume_text: row.raw_resume_text,
        years_of_experience: row.years_of_experience
          ? parseFloat(row.years_of_experience)
          : undefined,
        skills: (row.skills || []).filter(Boolean) as string[],
        work_history: (row.work_history && row.work_history[0] !== null
          ? row.work_history
          : []) as CandidateData["work_history"],
        education: (row.education && row.education[0] !== null
          ? row.education
          : []) as CandidateData["education"],
        certifications: (row.certifications || []).filter(Boolean) as string[],
        projects: row.projects || [],
        parsed_data: row.parsed_data || null,
      }));

      // 4. Score and rank candidates using the local ATS engine
      console.log(`⚙️  ATS Engine: Scoring ${candidates.length} candidates...`);
      const ranked = rankCandidates(extractedJD, candidates);
      console.log(`✅ ATS Ranking complete. Top score: ${ranked[0]?.overall_score ?? 0}%`);

      // 5. Return results (stateless — no DB write required for JD matching)
      res.json({
        success: true,
        extracted_skills: extractedJD.skills,
        experience_required: extractedJD.experienceYears,
        experience_text: extractedJD.experienceText, // Add this
        role_keywords: extractedJD.roleKeywords,
        education_keywords: extractedJD.educationKeywords,
        total_candidates: candidates.length,
        matches: ranked,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in parseJDAndMatch:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to process Job Description matching.",
    });
  }
};
