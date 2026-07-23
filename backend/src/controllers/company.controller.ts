import { Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { getClient } from "../database/db";
import { addCompanyScrapeJob } from "../queues/company-scrape.queue";
// @ts-ignore - JS module without type definitions
import { calculateHiringScore } from "../services/companyIntel/level5HiringScore";

interface ScanCompanyRequest {
  website: string;
}

interface CompanyFilters {
  search?: string;
  industry?: string;
  minScore?: number;
  hiringStatus?: string;
  page?: number;
  limit?: number;
}

/**
 * POST /api/companies/scan
 * Upsert company and enqueue scrape job
 */
export const scanCompany = async (req: Request, res: Response): Promise<Response | undefined> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    const { website } = req.body as ScanCompanyRequest;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Upsert company by website
      const upsertQuery = `
        INSERT INTO companies (name, website, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        ON CONFLICT (website)
        DO UPDATE SET
          updated_at = NOW(),
          is_active = true
        RETURNING id, name, website
      `;

      // Extract company name from website for initial insert
      const domain = new URL(website).hostname.replace('www.', '');
      const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

      const result = await client.query(upsertQuery, [companyName, website]);
      const company = result.rows[0];

      // Create scrape_jobs record BEFORE enqueuing
      const scrapeJobQuery = `
        INSERT INTO scrape_jobs (company_id, status, level_reached, created_at)
        VALUES ($1, 'queued', 1, NOW())
        RETURNING id
      `;
      const scrapeJobResult = await client.query(scrapeJobQuery, [company.id]);
      const scrapeJobId = scrapeJobResult.rows[0].id;

      await client.query('COMMIT');

      // Enqueue scrape job
      const job = await addCompanyScrapeJob(company.id);

      return res.status(201).json({
        companyId: company.id,
        jobId: job.id,
        status: "queued",
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error scanning company:", error);
    console.error("Error details:", error.message);
    return res.status(500).json({ error: "Failed to scan company", details: error.message });
  }
};

/**
 * GET /api/companies/:id
 * Get full company record with contacts, jobs, and scrape status
 */
export const getCompanyById = async (req: Request, res: Response): Promise<Response | undefined> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    const { id } = req.params;

    const client = await getClient();

    try {
      // Get company basic info
      const companyQuery = `
        SELECT id, name, website, career_url, linkedin_url, industry, company_size, 
               hiring_status, hiring_score, last_scraped_at, created_at, updated_at
        FROM companies
        WHERE id = $1
      `;
      const companyResult = await client.query(companyQuery, [id]);

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: "Company not found" });
      }

      const company = companyResult.rows[0];

      // Get contacts
      const contactsQuery = `
        SELECT id, contact_type, email, phone, created_at
        FROM company_contacts
        WHERE company_id = $1
      `;
      const contactsResult = await client.query(contactsQuery, [id]);
      const contacts = contactsResult.rows;

      // Get active jobs
      const jobsQuery = `
        SELECT id, title, location, experience_level, job_url, posted_date, last_seen_at
        FROM company_jobs
        WHERE company_id = $1 AND is_active = true
        ORDER BY posted_date DESC
      `;
      const jobsResult = await client.query(jobsQuery, [id]);
      const jobs = jobsResult.rows;

      // Get latest scrape job status
      const scrapeJobQuery = `
        SELECT id, status, level_reached, error_message, created_at
        FROM scrape_jobs
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const scrapeJobResult = await client.query(scrapeJobQuery, [id]);
      const scrapeJob = scrapeJobResult.rows[0] || null;

      // Calculate hiring score breakdown if score exists
      let hiringScoreBreakdown = null;
      if (company.hiring_score !== null) {
        // Re-calculate to get breakdown
        try {
          const scoreResult = await calculateHiringScore(id);
          hiringScoreBreakdown = scoreResult.breakdown;
        } catch (error: any) {
          console.error("Error calculating hiring score breakdown:", error);
          // If calculation fails, return null breakdown
        }
      }

      return res.json({
        company,
        contacts,
        jobs,
        scrapeJob,
        hiringScoreBreakdown,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error getting company:", error);
    return res.status(500).json({ error: "Failed to get company", details: error.message });
  }
};

/**
 * GET /api/companies/:id/scan-status
 * Get current scrape status for a company
 */
export const getCompanyScanStatus = async (req: Request, res: Response): Promise<Response | undefined> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    const { id } = req.params;

    const client = await getClient();

    try {
      const query = `
        SELECT id, status, level_reached, error_message, created_at
        FROM scrape_jobs
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No scrape job found for this company" });
      }

      return res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error getting scan status:", error);
    return res.status(500).json({ error: "Failed to get scan status", details: error.message });
  }
};

/**
 * GET /api/companies
 * Get paginated list of companies with filters
 */
export const getCompanies = async (req: Request, res: Response): Promise<Response | undefined> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    const {
      search,
      industry,
      minScore,
      hiringStatus,
      page = 1,
      limit = 20,
    } = req.query as CompanyFilters;

    const offset = (Number(page) - 1) * Number(limit);
    const conditions: string[] = ["is_active = true"];
    const params: any[] = [];
    let paramIndex = 1;

    // Build search conditions
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR website ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (industry) {
      conditions.push(`industry = $${paramIndex}`);
      params.push(industry);
      paramIndex++;
    }

    if (minScore) {
      conditions.push(`hiring_score >= $${paramIndex}`);
      params.push(Number(minScore));
      paramIndex++;
    }

    if (hiringStatus) {
      conditions.push(`hiring_status = $${paramIndex}`);
      params.push(hiringStatus);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM companies
      ${whereClause}
    `;
    const countResult = await getClient().then(client => {
      return client.query(countQuery, params).finally(() => client.release());
    });
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT id, name, website, career_url, linkedin_url, industry, company_size,
             hiring_status, hiring_score, last_scraped_at, created_at, updated_at
      FROM companies
      ${whereClause}
      ORDER BY hiring_score DESC NULLS LAST, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(Number(limit), offset);

    const dataResult = await getClient().then(client => {
      return client.query(dataQuery, params).finally(() => client.release());
    });

    return res.json({
      data: dataResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error getting companies:", error);
    return res.status(500).json({ error: "Failed to get companies" });
  }
};

/**
 * POST /api/companies/:id/rescan
 * Manually re-trigger a scrape
 */
export const rescanCompany = async (req: Request, res: Response): Promise<Response | undefined> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    const { id } = req.params;

    const client = await getClient();

    try {
      // Check if company exists
      const companyQuery = `
        SELECT id, website
        FROM companies
        WHERE id = $1
      `;
      const companyResult = await client.query(companyQuery, [id]);

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: "Company not found" });
      }

      const company = companyResult.rows[0];

      // Enqueue scrape job
      const job = await addCompanyScrapeJob(company.id);

      return res.json({
        companyId: company.id,
        jobId: job.id,
        status: "queued",
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error rescanning company:", error);
    return res.status(500).json({ error: "Failed to rescan company" });
  }
};

// Validation middleware
export const validateScanCompany = [
  body("website")
    .isString()
    .isURL({ require_protocol: true })
    .withMessage("Website must be a valid URL with protocol"),
];

export const validateCompanyId = [
  param("id")
    .isUUID()
    .withMessage("Company ID must be a valid UUID"),
];

export const validateCompanyFilters = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("minScore").optional().isInt({ min: 0, max: 100 }).withMessage("minScore must be between 0 and 100"),
  query("hiringStatus").optional().isIn(["not_hiring", "hiring", "actively_hiring", "occasionally_hiring"])
  
];