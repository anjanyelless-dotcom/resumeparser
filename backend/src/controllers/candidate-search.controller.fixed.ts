import { Request, Response } from "express";
import { getClient } from "../database/db";
import { buildVirtualJDFromFilters, FilterCriteria } from "../services/virtual-jd-builder.service";
import { rankCandidates, CandidateData } from "../services/ats-engine.service";
import { getRoleSynonyms } from "../services/role-skill-mapping.service";

/**
 * Controller for candidate search by filters
 * Provides two-stage filtering: database pre-filtering + ATS scoring
 *
 * CORRECTED VERSION - Fixes role filtering at database level
 */

/**
 * Search candidates by structured filters
 *
 * Stage 1: Database pre-filtering (hard filters)
 * - Apply exact matches in SQL for performance
 * - Filters: role, skills, locations, currentCompany, noticePeriod, employmentType, experience range
 * - Role filter uses synonyms for better matching
 * - Skills filter uses EXISTS for performance
 * - Pagination support
 *
 * Stage 2: ATS scoring (soft filters)
 * - Build virtual JD from filters (with role-skill mapping)
 * - Use existing ATS Engine for scoring
 * - Filter out low-score candidates (minimum threshold)
 * - Return ranked candidates
 */

// Minimum score threshold to filter out low matches
const MIN_OVERALL_SCORE = 30;

export const searchCandidatesByFilters = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const filters: FilterCriteria = {
      role: req.body.role,
      skills: req.body.skills,
      minExperience: req.body.minExperience,
      maxExperience: req.body.maxExperience,
      locations: req.body.locations,
      education: req.body.education,
      noticePeriod: req.body.noticePeriod,
      currentCompany: req.body.currentCompany,
      employmentType: req.body.employmentType,
    };

    const page = parseInt(req.body.page as string) || 1;
    const limit = parseInt(req.body.limit as string) || 20;
    const offset = (page - 1) * limit;

    const client = await getClient();

    try {
      // Stage 1: Database pre-filtering with hard filters
      const queryParams: any[] = [];
      let paramIndex = 1;
      let whereClause = "WHERE c.status = 'success' AND c.deleted_at IS NULL";

      // ✅ FIX 1: Role filter (hard filter at database level)
      if (filters.role) {
        const roleSynonyms = getRoleSynonyms(filters.role);
        const rolePatterns = roleSynonyms.map(r => `%${r}%`);

        whereClause += ` AND (
          c.current_title ILIKE ANY($${paramIndex})
          OR c.job_titles @> $${paramIndex + 1}::jsonb
        )`;
        queryParams.push(rolePatterns, JSON.stringify([filters.role]));
        paramIndex += 2;
      }

      // ✅ FIX 2: Skills filter (hard filter at database level)
      if (filters.skills && filters.skills.length > 0) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM candidate_skills cs
          JOIN skills s ON cs.skill_id = s.id
          WHERE cs.candidate_id = c.id
          AND s.name = ANY($${paramIndex})
        )`;
        queryParams.push(filters.skills);
        paramIndex++;
      }

      // Location filter (hard filter)
      if (filters.locations && filters.locations.length > 0) {
        whereClause += ` AND c.location = ANY($${paramIndex})`;
        queryParams.push(filters.locations);
        paramIndex++;
      }

      // Current Company filter (hard filter)
      if (filters.currentCompany && filters.currentCompany.length > 0) {
        whereClause += ` AND c.current_company = ANY($${paramIndex})`;
        queryParams.push(filters.currentCompany);
        paramIndex++;
      }

      // Notice Period filter (hard filter)
      if (filters.noticePeriod && filters.noticePeriod.length > 0) {
        whereClause += ` AND c.notice_period = ANY($${paramIndex})`;
        queryParams.push(filters.noticePeriod);
        paramIndex++;
      }

      // Employment Type filter (hard filter)
      if (filters.employmentType && filters.employmentType.length > 0) {
        whereClause += ` AND c.employment_type = ANY($${paramIndex})`;
        queryParams.push(filters.employmentType);
        paramIndex++;
      }

      // Experience range filter (hard filter)
      if (filters.minExperience !== undefined) {
        whereClause += ` AND c.years_experience >= $${paramIndex}`;
        queryParams.push(filters.minExperience);
        paramIndex++;
      }

      if (filters.maxExperience !== undefined) {
        whereClause += ` AND c.years_experience <= $${paramIndex}`;
        queryParams.push(filters.maxExperience);
        paramIndex++;
      }

      // ✅ FIX 3: Get total count for pagination (after role/skills filtering)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM candidates c
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Fetch filtered candidates with skills, work_history, education
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
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const candidatesResult = await client.query(candidatesQuery, queryParams);
      const candidates = candidatesResult.rows;

      if (candidates.length === 0) {
        res.json({
          success: true,
          searchType: "filters",
          criteria: filters,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: total,
            items_per_page: limit,
            has_next_page: page < totalPages,
            has_prev_page: page > 1,
          },
          candidates: [],
        });
        return;
      }

      // Stage 2: ATS scoring with virtual JD
      const virtualJD = buildVirtualJDFromFilters(filters);

      // Convert candidates to ATS engine format
      const atsCandidates: CandidateData[] = candidates.map((candidate) => ({
        id: candidate.id,
        full_name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        summary: candidate.summary,
        years_of_experience: candidate.years_experience,
        skills: Array.isArray(candidate.skills) ? candidate.skills.filter((s: any) => typeof s === 'string' && s.trim()) : [],
        work_history: Array.isArray(candidate.work_history) && candidate.work_history[0] !== null ? candidate.work_history : [],
        education: Array.isArray(candidate.education) ? candidate.education : [],
        certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
        projects: candidate.projects,
        parsed_data: null,
      }));

      // Use existing ATS Engine for ranking
      const atsResults = await rankCandidates(virtualJD, atsCandidates);

      // Map ATS results to expected response format
      const candidatesWithScores = atsResults.map((atsResult) => {
        const candidate = candidates.find((c) => c.id === atsResult.candidate_id);
        return {
          id: atsResult.candidate_id,
          full_name: atsResult.candidate_name,
          email: atsResult.candidate_email,
          phone: atsResult.candidate_phone,
          location: atsResult.candidate_location,
          current_title: candidate?.current_title,
          current_company: candidate?.current_company,
          years_experience: atsResult.experience_years,
          skills: candidate?.skills || [],
          overall_score: atsResult.overall_score,
          skill_score: atsResult.skill_score,
          experience_score: atsResult.experience_score,
          education_score: atsResult.education_score,
          role_score: atsResult.role_score,
          project_score: atsResult.project_score,
          certification_score: atsResult.certification_score,
          matching_skills: atsResult.matched_skills,
          missing_skills: atsResult.missing_skills,
          extra_skills: [],
          experience_gap_years: (virtualJD.experienceYears || 0) - (atsResult.experience_years || 0),
          recommendation: atsResult.match_label,
          match_summary: atsResult.match_summary,
        };
      });

      // ✅ FIX 4: Filter out low-score candidates
      const filteredCandidates = candidatesWithScores.filter(
        candidate => candidate.overall_score >= MIN_OVERALL_SCORE
      );

      // ✅ FIX 5: Sort by overall score descending
      const sortedCandidates = filteredCandidates.sort(
        (a, b) => b.overall_score - a.overall_score
      );

      // ✅ FIX 6: Recalculate pagination after score filtering
      const filteredTotal = sortedCandidates.length;
      const filteredTotalPages = Math.ceil(filteredTotal / limit);
      const paginatedCandidates = sortedCandidates.slice(offset, offset + limit);

      res.json({
        success: true,
        searchType: "filters",
        criteria: filters,
        pagination: {
          current_page: page,
          total_pages: filteredTotalPages,
          total_items: filteredTotal,
          items_per_page: limit,
          has_next_page: page < filteredTotalPages,
          has_prev_page: page > 1,
        },
        candidates: paginatedCandidates,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error searching candidates by filters:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to search candidates",
    });
  }
};

/**
 * Get filter options for the search form
 * Returns available values for each filter field
 */
export const getFilterOptions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const client = await getClient();

    try {
      // Get unique roles from current_title and job_titles
      const rolesQuery = `
        SELECT DISTINCT unnest(job_titles) as role
        FROM candidates
        WHERE status = 'success' AND deleted_at IS NULL
        AND job_titles IS NOT NULL AND array_length(job_titles, 1) > 0

        UNION

        SELECT DISTINCT current_title as role
        FROM candidates
        WHERE status = 'success' AND deleted_at IS NULL
        AND current_title IS NOT NULL AND current_title != ''

        ORDER BY role
      `;
      const rolesResult = await client.query(rolesQuery);

      // Get unique skills
      const skillsQuery = `
        SELECT DISTINCT s.name, s.category
        FROM skills s
        JOIN candidate_skills cs ON s.id = cs.skill_id
        JOIN candidates c ON cs.candidate_id = c.id
        WHERE c.status = 'success' AND c.deleted_at IS NULL
        ORDER BY s.name
      `;
      const skillsResult = await client.query(skillsQuery);

      // Get unique locations
      const locationsQuery = `
        SELECT DISTINCT location
        FROM candidates
        WHERE status = 'success' AND deleted_at IS NULL
        AND location IS NOT NULL AND location != ''
        ORDER BY location
      `;
      const locationsResult = await client.query(locationsQuery);

      // Get unique education levels
      const educationQuery = `
        SELECT DISTINCT degree
        FROM education e
        JOIN candidates c ON e.candidate_id = c.id
        WHERE c.status = 'success' AND c.deleted_at IS NULL
        AND e.degree IS NOT NULL AND e.degree != ''
        ORDER BY degree
      `;
      const educationResult = await client.query(educationQuery);

      // Get unique notice periods
      const noticePeriodQuery = `
        SELECT DISTINCT notice_period
        FROM candidates
        WHERE status = 'success' AND deleted_at IS NULL
        AND notice_period IS NOT NULL AND notice_period != ''
        ORDER BY notice_period
      `;
      const noticePeriodResult = await client.query(noticePeriodQuery);

      // Get unique employment types
      const employmentTypeQuery = `
        SELECT DISTINCT employment_type
        FROM candidates
        WHERE status = 'success' AND deleted_at IS NULL
        AND employment_type IS NOT NULL AND employment_type != ''
        ORDER BY employment_type
      `;
      const employmentTypeResult = await client.query(employmentTypeQuery);

      // Get unique companies
      const companiesQuery = `
        SELECT DISTINCT current_company
        FROM candidates
        WHERE status = 'success' AND deleted_at IS NULL
        AND current_company IS NOT NULL AND current_company != ''
        ORDER BY current_company
      `;
      const companiesResult = await client.query(companiesQuery);

      res.json({
        roles: rolesResult.rows.map(r => r.role).filter(r => r),
        skills: skillsResult.rows.map(s => ({
          name: s.name,
          category: s.category || 'General'
        })),
        locations: locationsResult.rows.map(l => l.location).filter(l => l),
        education: educationResult.rows.map(e => e.degree).filter(e => e),
        noticePeriod: noticePeriodResult.rows.map(n => n.notice_period).filter(n => n),
        employmentType: employmentTypeResult.rows.map(e => e.employment_type).filter(e => e),
        companies: companiesResult.rows.map(c => c.current_company).filter(c => c),
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error getting filter options:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get filter options",
    });
  }
};