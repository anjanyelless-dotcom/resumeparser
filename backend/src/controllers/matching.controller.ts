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
        SELECT j.id, j.title, j.description, j.location, j.experience_years, j.salary_range, j.created_at, j.updated_at,
               array_agg(DISTINCT js.skill_name) as required_skills,
               array_agg(DISTINCT ps.skill_name) as preferred_skills
        FROM job_descriptions j
        LEFT JOIN job_skills js ON j.id = js.job_id AND js.skill_type = 'required'
        LEFT JOIN job_skills ps ON j.id = ps.job_id AND ps.skill_type = 'preferred'
        WHERE j.id = $1
        GROUP BY j.id, j.title, j.description, j.location, j.experience_years, j.salary_range, j.created_at, j.updated_at
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
                 SELECT array_agg(DISTINCT s.skill_name)
                 FROM candidate_skills cs
                 JOIN skills s ON cs.skill_id = s.id
                 WHERE cs.candidate_id = c.id
               ) as skills,
               (
                 SELECT json_agg(we.*)
                 FROM work_history we
                 WHERE we.candidate_id = c.id
               ) as work_history,
               (
                 SELECT json_agg(ed.*)
                 FROM education ed
                 WHERE ed.candidate_id = c.id
               ) as education,
               (
                 SELECT json_agg(cert.*)
                 FROM certifications cert
                 WHERE cert.candidate_id = c.id
               ) as certifications
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
        work_history: candidate.work_history && candidate.work_history[0] !== null ? candidate.work_history : [],
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

      console.log(`🔍 Job Data for ${jobId}:`, {
        required_skills: jobData.required_skills,
        preferred_skills: jobData.preferred_skills,
        required_skills_type: typeof jobData.required_skills,
        preferred_skills_type: typeof jobData.preferred_skills
      });

      let matches: any[] = [];

      // Use local ATS engine for matching (no external AI dependency)
      try {
        console.log(`🔍 Using local ATS engine to match ${candidates.length} candidates`);

        // Extract JD data using the JD extractor service
        const requiredSkillsArray = Array.isArray(job.required_skills) ? job.required_skills : [];
        const preferredSkillsArray = Array.isArray(job.preferred_skills) ? job.preferred_skills : [];
        const jdText = `${job.title || ''}\n${job.description || ''}\nRequired Skills: ${requiredSkillsArray.filter(Boolean).join(', ')}\nPreferred Skills: ${preferredSkillsArray.filter(Boolean).join(', ')}`;
        const jdData = extractJD(jdText);

        // Convert candidates to ATS engine format
        const atsCandidates: CandidateData[] = candidates.map((candidate) => {
          const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills.filter((s: any) => typeof s === 'string' && s.trim()) : [];

          console.log(`🔍 Candidate ${candidate.id} skills:`, {
            skills: candidateSkills,
            skills_type: typeof candidate.skills,
            skills_count: candidateSkills.length
          });

          return {
            id: candidate.id,
            full_name: candidate.full_name,
            email: candidate.email,
            phone: candidate.phone,
            location: candidate.location,
            summary: candidate.summary,
            years_of_experience: candidate.years_experience,
            skills: candidateSkills,
            work_history: Array.isArray(candidate.work_history) && candidate.work_history[0] !== null ? candidate.work_history : [],
            education: Array.isArray(candidate.education) ? candidate.education : [],
            certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
            projects: candidate.projects,
            parsed_data: candidate.parsed_data || null,
          };
        });

        // Use local ATS engine for ranking
        const atsResults = await rankCandidates(jdData, atsCandidates);

        // Map ATS results to expected format
        matches = atsResults.map((atsResult) => {
          const candidate = candidates.find((c) => c.id === atsResult.candidate_id);
          return {
            candidate_id: atsResult.candidate_id,
            candidate_name: atsResult.candidate_name,
            candidate_email: atsResult.candidate_email,
            candidate_location: atsResult.candidate_location,
            overall_score: atsResult.overall_score,
            skill_score: atsResult.skill_score,
            experience_score: atsResult.experience_score,
            education_score: atsResult.education_score,
            role_score: atsResult.role_score,
            project_score: atsResult.project_score,
            certification_score: atsResult.certification_score,
            matching_skills: atsResult.matched_skills,
            missing_skills: atsResult.missing_skills,
            extra_skills: [], // ATS engine doesn't provide this
            experience_gap_years: (jdData.experienceYears || 0) - (atsResult.experience_years || 0),
            recommendation: atsResult.match_label,
            reason: atsResult.match_summary,
          };
        });

        console.log(`✅ Successfully matched ${matches.length} candidates using local ATS engine`);

      } catch (atsError) {
        console.error("Error using local ATS engine:", atsError);
        // Fallback: return zero-scored candidates if ATS engine fails
        matches = candidates.map((candidate) => ({
          candidate_id: candidate.id,
          candidate_name: candidate.full_name,
          candidate_email: candidate.email,
          candidate_location: candidate.location,
          overall_score: 0,
          skill_score: 0,
          experience_score: 0,
          education_score: 0,
          role_score: 0,
          project_score: 0,
          certification_score: 0,
          matching_skills: [],
          missing_skills: (jobData.required_skills || []).filter(Boolean),
          extra_skills: [],
          experience_gap_years: 0,
          recommendation: "Not Recommended",
          reason: "ATS engine unavailable",
          error: true,
        }));
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
          experience_score, education_score, matched_skills, 
          missing_skills, role_score, project_score, certification_score,
          match_summary, jd_hash, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `;

      for (const match of sortedMatches) {
        if (!match.error) {
          console.log(`🔍 Saving match for candidate ${match.candidate_id}:`, {
            matched_skills: match.matched_skills,
            missing_skills: match.missing_skills,
            matched_skills_type: typeof match.matched_skills,
            missing_skills_type: typeof match.missing_skills
          });

          await client.query(insertScoreQuery, [
            jobId,
            match.candidate_id,
            match.overall_score,
            match.skill_score,
            match.experience_score,
            match.education_score,
            JSON.stringify(match.matched_skills || []),
            JSON.stringify(match.missing_skills || []),
            match.role_score || 0,
            match.project_score || 0,
            match.certification_score || 0,
            match.reason || '',
            '', // jd_hash
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
      details: error instanceof Error ? error.message : String(error),
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

      // Map match results safely and convert scores to numbers
      const matches = result.rows.map((row) => {
        const overallScore = parseFloat(row.overall_score);
        let recommendation = "Not Recommended";
        if (overallScore >= 80) recommendation = "Strong Match";
        else if (overallScore >= 70) recommendation = "Good Match";
        else if (overallScore >= 60) recommendation = "Partial Match";

        return {
          ...row,
          overall_score: overallScore,
          skill_score: parseFloat(row.skill_score),
          experience_score: parseFloat(row.experience_score),
          education_score: parseFloat(row.education_score),
          recommendation,
          matching_skills: row.matched_skills || [],
          missing_skills: row.missing_skills || [],
          extra_skills: [],
        };
      });

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

      // Map matching skills correctly and convert scores to numbers
      const matches = result.rows.map((row) => {
        const overallScore = parseFloat(row.overall_score);
        let recommendation = "Not Recommended";
        if (overallScore >= 80) recommendation = "Strong Match";
        else if (overallScore >= 70) recommendation = "Good Match";
        else if (overallScore >= 60) recommendation = "Partial Match";

        return {
          ...row,
          overall_score: overallScore,
          skill_score: parseFloat(row.skill_score),
          experience_score: parseFloat(row.experience_score),
          education_score: parseFloat(row.education_score),
          recommendation,
          matching_skills: row.matched_skills || [],
          missing_skills: row.missing_skills || [],
          extra_skills: [],
        };
      });

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
               ) as work_history,
               (
                 SELECT json_agg(ed.*)
                 FROM education ed
                 WHERE ed.candidate_id = c.id
               ) as education,
               (
                 SELECT json_agg(cert.*)
                 FROM certifications cert
                 WHERE cert.candidate_id = c.id
               ) as certifications
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
          work_history: candidate.work_history && candidate.work_history[0] !== null ? candidate.work_history : [],
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
          c.years_experience,
          c.projects,
          -- Skills array
          (
            SELECT array_agg(DISTINCT s.name)
            FROM candidate_skills cs
            JOIN skills s ON cs.skill_id = s.id
            WHERE cs.candidate_id = c.id
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
          -- Certifications (handle missing table gracefully)
          COALESCE(
            (
              SELECT array_agg(DISTINCT cert.name)
              FROM certifications cert
              WHERE cert.candidate_id = c.id
                AND cert.name IS NOT NULL
            ),
            ARRAY[]::text[]
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
        years_of_experience: row.years_experience,
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

      // Transform ATS results to match frontend expected structure
      const transformedMatches = ranked.map((match) => ({
        ...match,
        recommendation: match.match_label,
      }));

      // 5. Return results (stateless — no DB write required for JD matching)
      res.json({
        success: true,
        extracted_skills: extractedJD.skills,
        experience_required: extractedJD.experienceYears,
        experience_text: extractedJD.experienceText, // Add this
        role_keywords: extractedJD.roleKeywords,
        education_keywords: extractedJD.educationKeywords,
        total_candidates: candidates.length,
        matches: transformedMatches,
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
