import { Request, Response } from "express";
import { getClient } from "../database/db";
import { buildVirtualJDFromFilters, FilterCriteria } from "../services/virtual-jd-builder.service";
import { rankCandidates, CandidateData } from "../services/ats-engine.service";
import { searchGoogleXRay, searchGitHub, ExternalCandidate } from "../services/external-search.service";
import { generateXRayQueries } from "../services/xray-search-builder.service";
import { parseBooleanQuery, buildSqlFromBooleanAst, ParseError, BooleanNode, BooleanNodeType } from "../services/boolean-search-parser.service";

/**
 * Controller for candidate search by filters
 * Provides two-stage filtering: database pre-filtering + ATS scoring
 */

/**
 * Search candidates by structured filters
 * 
 * Stage 1: Database pre-filtering (hard filters)
 * - Apply exact matches in SQL for performance
 * - Filters: locations, currentCompany, noticePeriod, employmentType, experience range
 * - Pagination support
 * 
 * Stage 2: ATS scoring (soft filters)
 * - Build virtual JD from filters
 * - Use existing ATS Engine for scoring
 * - Return ranked candidates
 */
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
      let whereClause = "WHERE c.status IN ('success', 'pending', 'processing') AND c.deleted_at IS NULL";
      
      // Role filter (flexible hard filter)
      if (filters.role && filters.role.trim() !== '') {
        const terms = filters.role.trim().split(/\s+/);
        terms.forEach(term => {
          whereClause += ` AND (c.current_title ILIKE $${paramIndex} OR c.summary ILIKE $${paramIndex} OR c.raw_resume_text ILIKE $${paramIndex})`;
          queryParams.push(`%${term}%`);
          paramIndex++;
        });
      }
      
      // Skills filter (flexible hard filter)
      if (filters.skills && filters.skills.length > 0) {
        const skillConditions = filters.skills.map(() => {
          const idx = paramIndex++;
          return `(
            EXISTS (
              SELECT 1 FROM candidate_skills cs 
              JOIN skills s ON cs.skill_id = s.id 
              WHERE cs.candidate_id = c.id AND (s.name ILIKE $${idx} OR s.skill_name ILIKE $${idx})
            ) OR c.raw_resume_text ILIKE $${idx}
          )`;
        });
        whereClause += ` AND (${skillConditions.join(' AND ')})`;
        filters.skills.forEach(skill => queryParams.push(`%${skill}%`));
      }
      
      // Location filter (flexible hard filter)
      if (filters.locations && filters.locations.length > 0) {
        const locConditions = filters.locations.map(() => `c.location ILIKE $${paramIndex++}`);
        whereClause += ` AND (${locConditions.join(' OR ')})`;
        filters.locations.forEach(loc => queryParams.push(`%${loc}%`));
      }
      
      // Current Company filter (flexible hard filter)
      if (filters.currentCompany && filters.currentCompany.length > 0) {
        const compConditions = filters.currentCompany.map(() => `c.current_company ILIKE $${paramIndex++}`);
        whereClause += ` AND (${compConditions.join(' OR ')})`;
        filters.currentCompany.forEach(comp => queryParams.push(`%${comp}%`));
      }
      
      // Notice Period filter (hard filter)
      if (filters.noticePeriod && filters.noticePeriod.length > 0) {
        whereClause += ` AND c.notice_period = ANY($${paramIndex})`;
        queryParams.push(filters.noticePeriod);
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

      // Get total count for pagination
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
                 SELECT array_agg(DISTINCT COALESCE(s.skill_name, s.name))
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

      // Sort by overall score descending
      const sortedCandidates = candidatesWithScores.sort(
        (a, b) => b.overall_score - a.overall_score
      );

      // External search fallback (feature-gated)
      const ENABLE_EXTERNAL_SEARCH = process.env.ENABLE_EXTERNAL_SEARCH === "true";
      const MIN_INTERNAL_RESULTS = parseInt(process.env.MIN_INTERNAL_RESULTS || "5", 10);
      let externalCandidates: ExternalCandidate[] = [];
      let externalSearchTriggered = false;

      if (
        ENABLE_EXTERNAL_SEARCH &&
        sortedCandidates.length < MIN_INTERNAL_RESULTS &&
        (filters.role || (filters.skills && filters.skills.length > 0))
      ) {
        externalSearchTriggered = true;

        try {
          console.log("🔍 Internal results below threshold, triggering external search...");

          // Create timeout promise with proper typing
          const timeout = <T,>(ms: number): Promise<T> =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), ms)
            );

          // Run external searches in parallel with timeout
          const searchPromises = [
            Promise.race<ExternalCandidate[]>([
              searchGoogleXRay(filters),
              timeout<ExternalCandidate[]>(5000).catch(() => {
                console.warn("⚠️  Google X-Ray search timed out after 5s");
                return [] as ExternalCandidate[];
              }),
            ]),
            Promise.race<ExternalCandidate[]>([
              searchGitHub(filters),
              timeout<ExternalCandidate[]>(5000).catch(() => {
                console.warn("⚠️  GitHub search timed out after 5s");
                return [] as ExternalCandidate[];
              }),
            ]),
          ];

          const results = await Promise.allSettled(searchPromises);

          // Extract successful results with proper typing
          const googleResults: ExternalCandidate[] =
            results[0].status === "fulfilled" ? results[0].value : [];
          const githubResults: ExternalCandidate[] =
            results[1].status === "fulfilled" ? results[1].value : [];

          externalCandidates = [...googleResults, ...githubResults];

          console.log(`✅ External search found ${externalCandidates.length} candidates (Google: ${googleResults.length}, GitHub: ${githubResults.length})`);
        } catch (error) {
          console.error("❌ Error in external search fallback:", error);
          externalCandidates = [];
        }
      }

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
        candidates: sortedCandidates,
        externalCandidates: {
          triggered: externalSearchTriggered,
          sources: ["linkedin_google", "github"],
          results: externalCandidates,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in searchCandidatesByFilters:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to search candidates by filters",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Get available filter options from database
 * Returns distinct values for role, location, education, company, and skills
 * Returns static arrays for notice period and employment type enums
 */
export const getFilterOptions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const client = await getClient();

    try {
      // Get distinct roles (current_title)
      const rolesQuery = `
        SELECT DISTINCT current_title
        FROM candidates
        WHERE current_title IS NOT NULL 
          AND current_title != ''
          AND deleted_at IS NULL
        ORDER BY current_title
        LIMIT 100
      `;
      const rolesResult = await client.query(rolesQuery);
      const roles = rolesResult.rows.map((row) => row.current_title);

      // Get distinct locations
      const locationsQuery = `
        SELECT DISTINCT location
        FROM candidates
        WHERE location IS NOT NULL 
          AND location != ''
          AND deleted_at IS NULL
        ORDER BY location
        LIMIT 100
      `;
      const locationsResult = await client.query(locationsQuery);
      const locations = locationsResult.rows.map((row) => row.location);

      // Get distinct education degrees
      const educationQuery = `
        SELECT DISTINCT degree
        FROM education
        WHERE degree IS NOT NULL 
          AND degree != ''
        ORDER BY degree
        LIMIT 50
      `;
      const educationResult = await client.query(educationQuery);
      const education = educationResult.rows.map((row) => row.degree);

      // Get distinct current companies
      const companiesQuery = `
        SELECT DISTINCT current_company
        FROM candidates
        WHERE current_company IS NOT NULL 
          AND current_company != ''
          AND deleted_at IS NULL
        ORDER BY current_company
        LIMIT 100
      `;
      const companiesResult = await client.query(companiesQuery);
      const companies = companiesResult.rows.map((row) => row.current_company);

      // Get all skills with categories
      const skillsQuery = `
        SELECT name, category
        FROM skills
        ORDER BY category, name
        LIMIT 500
      `;
      const skillsResult = await client.query(skillsQuery);
      const skills = skillsResult.rows.map((row) => ({
        name: row.name,
        category: row.category,
      }));

      // Static arrays for enums (will be migrated to database later)
      const noticePeriod = [
        "immediate",
        "15_days",
        "30_days",
        "45_days",
        "60_days",
        "90_days",
        "not_serving",
      ];

      const employmentType = [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "freelance",
      ];

      res.json({
        roles,
        skills,
        locations,
        education,
        noticePeriod,
        employmentType,
        companies,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getFilterOptions:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to get filter options",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Generate X-Ray search queries for multiple platforms
 *
 * Returns ready-to-use Google search URLs for:
 * - LinkedIn (site:linkedin.com/in)
 * - GitHub (site:github.com)
 * - Naukri (site:naukri.com)
 * - Wellfound (site:wellfound.com)
 * - Combined search across all platforms
 */
export const generateXRaySearch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role, skills, locations, minExperience, maxExperience, currentCompany } = req.body;

    // Build experience string if both min and max are provided
    let experience: string | undefined;
    if (minExperience !== undefined && maxExperience !== undefined) {
      experience = `${minExperience}-${maxExperience}`;
    } else if (minExperience !== undefined) {
      experience = `${minExperience}+`;
    } else if (maxExperience !== undefined) {
      experience = `0-${maxExperience}`;
    }

    // Build XRayFilters object
    const xrayFilters = {
      role,
      skills,
      locations,
      experience,
      currentCompany,
    };

    // Generate X-Ray queries and URLs
    const { queries, urls } = generateXRayQueries(xrayFilters);

    res.json({
      success: true,
      filters: xrayFilters,
      queries,
      urls,
    });
  } catch (error) {
    console.error("Error in generateXRaySearch:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to generate X-Ray search queries",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Search candidates using Boolean query syntax
 * 
 * Supports AND, OR, NOT operators, parentheses for grouping, and quoted phrases
 * Parses the boolean query into an AST, then converts to parameterized SQL
 * Uses the combined_search_text column for unified text matching
 * 
 * Example query: ("Frontend Developer" OR "React Developer") AND (React OR Redux) AND NOT Angular
 */
export const booleanSearchCandidates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query, page = 1, limit = 20 } = req.body;

    // Validate query is non-empty
    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'INVALID_QUERY',
        message: 'Query cannot be empty',
      });
      return;
    }

    // Parse the boolean query into an AST
    let ast;
    try {
      ast = parseBooleanQuery(query.trim());
    } catch (error) {
      if (error instanceof ParseError) {
        res.status(400).json({
          success: false,
          error: 'PARSE_ERROR',
          message: error.message,
          position: error.position,
        });
        return;
      }
      throw error;
    }

    // Convert AST to SQL (using string replacement for reliability)
    const { sql: booleanWhereClause } = buildSqlFromBooleanAstUnsafe(ast, 'c.raw_resume_text');

    const client = await getClient();
    try {
      const currentPage = parseInt(page as string) || 1;
      const itemsPerPage = parseInt(limit as string) || 20;
      const offset = (currentPage - 1) * itemsPerPage;

      // Combine base filters with boolean search condition
      const baseWhereClause = "c.status = 'success' AND c.deleted_at IS NULL";
      const fullWhereClause = `${baseWhereClause} AND (${booleanWhereClause})`;
      
      // No boolean params needed since we're using string replacement
      const queryParams: (string | number)[] = [];
      let paramIndex = 1;

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM candidates c
        WHERE ${fullWhereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / itemsPerPage);

      // Fetch candidates with skills
      const candidatesQuery = `
        SELECT c.id,
               c.full_name,
               c.email,
               c.phone,
               c.location,
               c.current_title,
               c.current_company,
               c.years_experience,
               (
                 SELECT array_agg(DISTINCT COALESCE(s.skill_name, s.name))
                 FROM candidate_skills cs
                 JOIN skills s ON cs.skill_id = s.id
                 WHERE cs.candidate_id = c.id
               ) as skills
        FROM candidates c
        WHERE ${fullWhereClause}
        ORDER BY c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(itemsPerPage, offset);

      const candidatesResult = await client.query(candidatesQuery, queryParams);
      const candidates = candidatesResult.rows.map((row: any) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        location: row.location,
        current_title: row.current_title,
        current_company: row.current_company,
        years_experience: row.years_experience,
        skills: Array.isArray(row.skills) ? row.skills.filter((s: any) => s !== null) : [],
        // Explicitly set ATS scoring fields to null for boolean search
        overall_score: null,
        skill_score: null,
        experience_score: null,
        education_score: null,
        role_score: null,
        project_score: null,
        certification_score: null,
        matching_skills: null,
        missing_skills: null,
        extra_skills: null,
        experience_gap_years: null,
        recommendation: null,
        match_summary: null,
      }));

      res.json({
        success: true,
        searchType: "boolean",
        query: query.trim(),
        pagination: {
          current_page: currentPage,
          total_pages: totalPages,
          total_items: total,
          items_per_page: itemsPerPage,
          has_next_page: currentPage < totalPages,
          has_prev_page: currentPage > 1,
        },
        candidates,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in booleanSearchCandidates:", error);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to search candidates using boolean query",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Convert a boolean AST into SQL with string replacement (not parameterized)
 * This is safe because the boolean parser controls the input and validates syntax
 */
function buildSqlFromBooleanAstUnsafe(ast: BooleanNode, searchColumn: string): { sql: string } {
  function buildNode(node: BooleanNode): string {
    switch (node.type) {
      case 'TERM':
        // Use string replacement instead of parameterized query
        const escapedValue = node.value!.replace(/'/g, "''");
        return `${searchColumn} ILIKE '%${escapedValue}%'`;

      case 'NOT':
        const notSql = buildNode(node.left!);
        return `NOT ${notSql}`;

      case 'AND':
        const leftAnd = buildNode(node.left!);
        const rightAnd = buildNode(node.right!);
        return `(${leftAnd} AND ${rightAnd})`;

      case 'OR':
        const leftOr = buildNode(node.left!);
        const rightOr = buildNode(node.right!);
        return `(${leftOr} OR ${rightOr})`;

      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  const sql = buildNode(ast);
  return { sql };
}
