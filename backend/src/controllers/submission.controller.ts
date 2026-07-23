import { Request, Response } from "express";
import { getClient } from "../database/db";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";
import { buildScopeFilter } from "../utils/rbac.utils";
import crypto from "crypto";
import { notifyUser } from "../services/notification.service";

// Helper function to write audit logs
const writeAuditLog = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any = null,
  ipAddress?: string
) => {
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        crypto.randomUUID(),
        userId,
        action,
        resourceType,
        resourceId,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log:", error);
  } finally {
    client.release();
  }
};

// Types
interface CreateSubmissionRequest {
  job_id: string;
  candidate_id: string;
}

interface UpdateSubmissionStatusRequest {
  status: string;
  rejectionReason?: string;
}

interface ClientOutcomeRequest {
  outcome: 'shortlisted' | 'rejected';
  notes?: string;
}

interface Submission {
  id: string;
  job_id: string;
  candidate_id: string;
  submitted_by: string;
  status: string;
  rejection_reason?: string;
  submitted_at: string;
  updated_at: string;
}

// Create submission
export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { job_id, candidate_id }: CreateSubmissionRequest = req.body;
    const userId = (req as any).user?.id;

    console.log('[createSubmission] Request received:', { job_id, candidate_id, userId });

    // Validate required fields
    if (!job_id || !candidate_id) {
      console.log('[createSubmission] Missing required fields');
      res.status(400).json({
        error: "Bad Request",
        message: "job_id and candidate_id are required",
        code: "MISSING_REQUIRED_FIELDS"
      });
      return;
    }

    if (!userId) {
      console.log('[createSubmission] Missing user ID');
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      console.log('[createSubmission] Transaction started');

      // Check if submission already exists
      const existingSubmission = await client.query(
        "SELECT id FROM submissions WHERE job_id = $1 AND candidate_id = $2",
        [job_id, candidate_id]
      );
      console.log('[createSubmission] Existing submission check:', existingSubmission.rows.length);

      if (existingSubmission.rows.length > 0) {
        await client.query("ROLLBACK");
        console.log('[createSubmission] Submission already exists');
        res.status(409).json({
          error: "Conflict",
          message: "Submission already exists for this job and candidate",
          code: "SUBMISSION_EXISTS",
          existingSubmissionId: existingSubmission.rows[0].id
        });
        return;
      }

      // Verify job exists
      const jobCheck = await client.query(
        "SELECT id FROM job_descriptions WHERE id = $1",
        [job_id]
      );
      console.log('[createSubmission] Job check:', jobCheck.rows.length);

      if (jobCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        console.log('[createSubmission] Job not found');
        res.status(404).json({
          error: "Not Found",
          message: "Job not found",
          code: "JOB_NOT_FOUND"
        });
        return;
      }

      // Verify candidate exists
      const candidateCheck = await client.query(
        "SELECT id FROM candidates WHERE id = $1",
        [candidate_id]
      );
      console.log('[createSubmission] Candidate check:', candidateCheck.rows.length);

      if (candidateCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        console.log('[createSubmission] Candidate not found');
        res.status(404).json({
          error: "Not Found",
          message: "Candidate not found",
          code: "CANDIDATE_NOT_FOUND"
        });
        return;
      }

      // Create submission
      console.log('[createSubmission] Creating submission with:', { job_id, candidate_id, userId });
      const submissionResult = await client.query(
        `INSERT INTO submissions (job_id, candidate_id, submitted_by, status, submitted_at, updated_at)
         VALUES ($1, $2, $3, 'Draft', NOW(), NOW())
         RETURNING *`,
        [job_id, candidate_id, userId]
      );

      const submission = submissionResult.rows[0];
      console.log('[createSubmission] Submission created:', submission.id);

      // Insert activity log - DISABLED (table might not exist or have different schema)
      // await client.query(
      //   `INSERT INTO activity_log (activity_type, related_id, user_id, tenant_id, created_at, details)
      //    VALUES ('candidate_submitted', $1, $2, $3, NOW(), $4)`,
      //   [submission.id, userId, tenantId, JSON.stringify({
      //     job_id,
      //     candidate_id,
      //     action: 'submission_created'
      //   })]
      // );

      // Insert audit log
      if (userId) {
        await writeAuditLog(
          userId,
          "CREATE_SUBMISSION",
          "submissions",
          submission.id,
          {
            job_id,
            candidate_id,
            status: 'Submitted'
          },
          req.ip
        );
      }

      await client.query("COMMIT");
      console.log('[createSubmission] Transaction committed');

      res.status(201).json({
        message: "Submission created successfully",
        submission
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      console.log('[createSubmission] Error during transaction:', error);
      
      console.error("Create submission error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create submission",
        code: "CREATE_SUBMISSION_FAILED",
        details: error.message
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create submission error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create submission",
      code: "CREATE_SUBMISSION_FAILED"
    });
  }
};

// Get submissions with optional filters
export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = req.query.jobId as string;
    const candidateId = req.query.candidateId as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid pagination parameters. Page must be ≥1, limit must be between 1-100",
        code: "INVALID_PAGINATION"
      });
      return;
    }

    const client = await getClient();
    try {
      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereClause = "WHERE 1=1";
      const queryParams: any[] = [];
      let paramIndex = 1;

      const user = (req as any).user;
      if (user && user.role === 'recruiter') {
        whereClause += ` AND s.submitted_by = $${paramIndex}`;
        queryParams.push(user.id);
        paramIndex++;
      }

      if (jobId) {
        whereClause += ` AND s.job_id = $${paramIndex}`;
        queryParams.push(jobId);
        paramIndex++;
      }

      if (candidateId) {
        whereClause += ` AND s.candidate_id = $${paramIndex}`;
        queryParams.push(candidateId);
        paramIndex++;
      }

      if (status) {
        // Support comma-separated status values e.g. "offer_extended,offer_accepted"
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        if (statuses.length === 1) {
          whereClause += ` AND LOWER(s.status) = LOWER($${paramIndex})`;
          queryParams.push(statuses[0]);
          paramIndex++;
        } else if (statuses.length > 1) {
          const placeholders = statuses.map((_, i) => `LOWER($${paramIndex + i})`).join(', ');
          whereClause += ` AND LOWER(s.status) IN (${placeholders})`;
          statuses.forEach(s => queryParams.push(s));
          paramIndex += statuses.length;
        }
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM submissions s 
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated submissions with details
      queryParams.push(limit, offset);
      const submissionsQuery = `
        SELECT 
          s.*,
          j.title as job_title,
          j.department as job_department,
          c.full_name as candidate_name,
          c.email as candidate_email,
          c.phone as candidate_phone,
          u.email as submitted_by_email,
          SPLIT_PART(u.email, '@', 1) as submitted_by_name,
          cl.company_name as client_name
        FROM submissions s
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN candidates c ON s.candidate_id = c.id
        LEFT JOIN users u ON s.submitted_by = u.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        ${whereClause}
        ORDER BY s.submitted_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const submissionsResult = await client.query(submissionsQuery, queryParams);
      const submissions = submissionsResult.rows;

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        submissions,
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
    console.error("Get submissions error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch submissions",
      code: "GET_SUBMISSIONS_FAILED"
    });
  }
};

// Get my submissions (submitted by current user)
export const getMySubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const jobId = req.query.jobId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log('[getMySubmissions] Request:', { userId, jobId, page, limit });

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid pagination parameters. Page must be ≥1, limit must be between 1-100",
        code: "INVALID_PAGINATION"
      });
      return;
    }

    const client = await getClient();
    try {
      const offset = (page - 1) * limit;

      let conditions = ['s.submitted_by = $1'];
      let queryParams: any[] = [userId];
      let paramIndex = 2;
      
      if (jobId) {
        conditions.push(`s.job_id = $${paramIndex}`);
        queryParams.push(jobId);
        paramIndex++;
      }
      
      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM submissions s
        WHERE ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      console.log('[getMySubmissions] Total submissions:', total);

      // Get paginated submissions with details
      const submissionsQuery = `
        SELECT
          s.*,
          j.title as job_title,
          COALESCE(cl.company_name, 'Unknown Company') as job_company,
          c.full_name as candidate_name,
          c.email as candidate_email
        FROM submissions s
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        LEFT JOIN candidates c ON s.candidate_id = c.id
        WHERE ${whereClause}
        ORDER BY s.submitted_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const submissionsResult = await client.query(submissionsQuery, [...queryParams, limit, offset]);
      const submissions = submissionsResult.rows;
      console.log('[getMySubmissions] Fetched submissions:', submissions.length);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        submissions,
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
  } catch (error: any) {
    console.error("Get my submissions error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch submissions",
      code: "GET_MY_SUBMISSIONS_FAILED",
      details: error.message
    });
  }
};

// Update submission status
export const updateSubmissionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rejectionReason }: UpdateSubmissionStatusRequest = req.body;
    const userId = (req as any).user?.id;

    if (!id) {
      res.status(400).json({
        error: "Bad Request",
        message: "Submission ID is required",
        code: "MISSING_SUBMISSION_ID"
      });
      return;
    }

    const VALID_STATUSES = [
      "draft", "ready_to_submit", "submitted", "waiting_for_client_response", "withdrawn",
      "client_review", "shortlisted_by_client", "rejected_by_client", "interview_scheduled",
      "interview_completed", "offer_extended", "offer_accepted", "offer_declined",
      "joined", "placed", "rejected"
    ];

    if (!status || !VALID_STATUSES.includes(status.toLowerCase())) {
      res.status(400).json({
        error: "Bad Request",
        message: `Invalid status '${status}'. Valid values: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS"
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Check if submission exists and fetch related data for notifications
      const existingSubmission = await client.query(
        `SELECT s.*, j.title as job_title, c.owner_user_id, can.full_name as candidate_name 
         FROM submissions s
         JOIN job_descriptions j ON s.job_id = j.id
         LEFT JOIN clients c ON j.client_id = c.id
         JOIN candidates can ON s.candidate_id = can.id
         WHERE s.id = $1`,
        [id]
      );

      if (existingSubmission.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({
          error: "Not Found",
          message: "Submission not found",
          code: "SUBMISSION_NOT_FOUND"
        });
        return;
      }

      // Map API status to DB stored format
      const statusMap: Record<string, string> = {
        'draft': 'Draft',
        'ready_to_submit': 'Ready To Submit',
        'submitted': 'Submitted',
        'waiting_for_client_response': 'Waiting For Client Response',
        'withdrawn': 'Withdrawn',
      };
      const dbStatus = statusMap[status.toLowerCase()] || status;

      const updateFields = ["status = $2", "updated_at = NOW()"];
      const queryParams: any[] = [id, dbStatus];
      let paramIndex = 3;

      if (dbStatus === 'Submitted' || dbStatus === 'Waiting For Client Response') {
        updateFields.push(`submitted_at = COALESCE(submitted_at, NOW())`);
        updateFields.push(`submitted_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      if (rejectionReason) {
        updateFields.push(`rejection_reason = $${paramIndex}`);
        queryParams.push(rejectionReason);
        paramIndex++;
      }

      // Allow updating notes
      const body = req.body as any;
      if (body.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        queryParams.push(body.notes);
        paramIndex++;
      }

      const updateQuery = `
        UPDATE submissions
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, queryParams);
      const submission = updateResult.rows[0];

      // Insert audit log
      if (userId) {
        await writeAuditLog(
          userId,
          "UPDATE_SUBMISSION_STATUS",
          "submissions",
          id as string,
          {
            old_status: existingSubmission.rows[0].status,
            new_status: status,
            rejection_reason: rejectionReason
          },
          req.ip
        );
      }

      const subData = existingSubmission.rows[0];
      const candidateName = subData.candidate_name || 'Candidate';

      // Notify relevant users
      if (status === 'Under Review') {
        // Notify the client owner (BDM/Client Manager)
        if (subData.owner_user_id) {
          notifyUser(subData.owner_user_id, {
            title: "Candidate Ready for Review",
            message: `${candidateName} has been submitted for Client Review for "${subData.job_title}".`,
            type: "info",
            link: `/bdm/submissions`
          });
        }
      } else if (status === 'offer_extended' || status === 'joined') {
        // Notify the Recruiter
        if (subData.submitted_by) {
          notifyUser(subData.submitted_by, {
            title: `Candidate ${status === 'joined' ? 'Joined' : 'Offered'}!`,
            message: `${candidateName} has ${status === 'joined' ? 'joined the company' : 'been offered the position'} for "${subData.job_title}".`,
            type: "success",
            link: `/recruiter/submissions`
          });
        }
      }

      // Check for Requirement Completion
      if (dbStatus === 'Placed' || dbStatus === 'Joined') {
        const jobId = subData.job_id;
        // Count placed/joined candidates
        const placedCountRes = await client.query(
          `SELECT COUNT(*) as count FROM submissions WHERE job_id = $1 AND status IN ('Placed', 'Joined')`,
          [jobId]
        );
        const placedCount = parseInt(placedCountRes.rows[0].count);

        // Get required positions
        const jobRes = await client.query(
          `SELECT number_of_openings FROM job_descriptions WHERE id = $1`,
          [jobId]
        );
        const requiredPositions = jobRes.rows[0]?.number_of_openings || 0;

        if (requiredPositions > 0 && placedCount >= requiredPositions) {
          await client.query(
            `UPDATE job_descriptions SET status = 'Completed', recruitment_status = 'Closed' WHERE id = $1`,
            [jobId]
          );
          
          if (userId) {
            await writeAuditLog(
              userId,
              "UPDATE_JOB_STATUS",
              "job_descriptions",
              jobId,
              { status: "Completed", reason: "All positions filled" },
              req.ip
            );
          }
        }
      }

      if (userId) {
        await writeAuditLog(
          userId,
          "UPDATE_SUBMISSION_STATUS",
          "submissions",
          id as string,
          { previous_status: existingSubmission.rows[0].status, new_status: dbStatus },
          req.ip
        );
      }

      await client.query("COMMIT");

      res.json({
        message: "Submission status updated successfully",
        submission
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Update submission status error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update submission status",
        code: "UPDATE_SUBMISSION_STATUS_FAILED",
        details: error.message
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update submission status error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update submission status",
      code: "UPDATE_SUBMISSION_STATUS_FAILED"
    });
  }
};

// Get submissions pending review for team lead
export const getPendingReviewSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    const client = await getClient();
    try {
      // Get requirements scope
      const scope = buildScopeFilter((req as any).user, 'submissions', 'u'); // u maps to recruiters2 in query

      let query = `
        SELECT DISTINCT
          s.id,
          s.job_id,
          s.candidate_id,
          s.submitted_by,
          s.status,
          s.rejection_reason,
          s.submitted_at,
          s.updated_at,
          j.title as job_title,
          cli.company_name as job_company,
          j.department,
          j.location,
          c.full_name as candidate_name,
          c.email as candidate_email,
          u.email as submitted_by_email,
          SPLIT_PART(u.email, '@', 1) as submitted_by_name,
          ms.overall_score as ai_match_score,
          -- Check if submission has been reviewed
          EXISTS (
            SELECT 1 FROM submission_reviews sr 
            WHERE sr.submission_id = s.id
          ) as has_review
        FROM submissions s
        JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cli ON j.client_id = cli.id
        JOIN candidates c ON s.candidate_id = c.id
        JOIN users u ON s.submitted_by = u.id
        LEFT JOIN match_scores ms ON ms.candidate_id = s.candidate_id AND ms.job_id = s.job_id
        LEFT JOIN job_recruiter_assignments jra ON j.id = jra.job_id
        LEFT JOIN users recruiters ON jra.recruiter_id = recruiters.id
        WHERE s.status NOT IN ('rejected', 'offer_accepted', 'offer_declined')
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND LOWER(s.status) = LOWER($${paramCount})`;
        params.push(status);
      }

      // Dynamic team lead filtering based on permissions
      if (scope.sql) {
        let injectedSql = scope.sql.replace('u.', 'recruiters2.');
        if (scope.params.length > 0) {
          paramCount++;
          injectedSql = injectedSql.replace('$PARAM', `$${paramCount}`);
          params.push(...scope.params);
        }
        query += `
          AND (
            EXISTS (
              SELECT 1 FROM job_recruiter_assignments jra2
              JOIN users recruiters2 ON jra2.recruiter_id = recruiters2.id
              WHERE jra2.job_id = j.id ${injectedSql}
            )
          )
        `;
      }

      // Filter out submissions that have already been reviewed
      query += `
        AND NOT EXISTS (
          SELECT 1 FROM submission_reviews sr 
          WHERE sr.submission_id = s.id
        )
      `;

      query += `
        ORDER BY s.submitted_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      params.push(limit, offset);

      const result = await client.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT s.id) as total
        FROM submissions s
        JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN job_recruiter_assignments jra ON j.id = jra.job_id
        LEFT JOIN users recruiters ON jra.recruiter_id = recruiters.id
        WHERE s.status NOT IN ('rejected', 'offer_accepted', 'offer_declined')
      `;

      const countParams: any[] = [];
      let countParamCount = 0;

      if (status) {
        countParamCount++;
        countQuery += ` AND LOWER(s.status) = LOWER($${countParamCount})`;
        countParams.push(status);
      }

      if (scope.sql) {
        let countInjectedSql = scope.sql.replace('u.', 'recruiters2.');
        if (scope.params.length > 0) {
          countParamCount++;
          countInjectedSql = countInjectedSql.replace('$PARAM', `$${countParamCount}`);
          countParams.push(...scope.params);
        }
        countQuery += `
          AND EXISTS (
            SELECT 1 FROM job_recruiter_assignments jra2
            JOIN users recruiters2 ON jra2.recruiter_id = recruiters2.id
            WHERE jra2.job_id = j.id ${countInjectedSql}
          )
        `;
      }

      countQuery += `
        AND NOT EXISTS (
          SELECT 1 FROM submission_reviews sr 
          WHERE sr.submission_id = s.id
        )
      `;

      const countResult = await client.query(countQuery, countParams);
      const totalItems = parseInt(countResult.rows[0].total);

      const submissions = result.rows.map(row => ({
        ...row,
        has_review: row.has_review,
        submitted_by: {
          email: row.submitted_by_email,
          name: row.submitted_by_name
        }
      }));

      res.json({
        submissions,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalItems / limit),
          total_items: totalItems,
          items_per_page: limit,
          has_next_page: page < Math.ceil(totalItems / limit),
          has_prev_page: page > 1,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get pending review submissions error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch pending review submissions",
      code: "GET_PENDING_REVIEW_SUBMISSION_FAILED"
    });
  }
};

// Review a submission
export const reviewSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    // Validate decision
    if (!decision || !['approved', 'rejected', 'needs_changes'].includes(decision)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Valid decision is required (approved, rejected, or needs_changes)",
        code: "INVALID_DECISION"
      });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Check if submission exists
      const submissionCheck = await client.query(
        "SELECT id, status FROM submissions WHERE id = $1",
        [id]
      );

      if (submissionCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({
          error: "Not Found",
          message: "Submission not found",
          code: "SUBMISSION_NOT_FOUND"
        });
        return;
      }

      // Check if submission already has a review
      const existingReview = await client.query(
        "SELECT id FROM submission_reviews WHERE submission_id = $1",
        [id]
      );

      if (existingReview.rows.length > 0) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Conflict",
          message: "Submission has already been reviewed",
          code: "SUBMISSION_ALREADY_REVIEWED"
        });
        return;
      }

      // Insert submission review
      await client.query(
        `INSERT INTO submission_reviews (submission_id, reviewed_by, decision, notes, reviewed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())`,
        [id, userId, decision, notes || null]
      );

      // Update submission status if approved
      let newStatus = submissionCheck.rows[0].status;
      if (decision === 'approved') {
        // Check system settings for pipeline stages
        const settingsResult = await client.query(
          "SELECT value FROM system_settings WHERE key = 'next_stage_after_approval'"
        );
        
        if (settingsResult.rows.length > 0 && settingsResult.rows[0].value) {
          newStatus = settingsResult.rows[0].value;
        } else {
          // Default fallback if no setting exists
          newStatus = 'Under Review';
        }

        await client.query(
          "UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2",
          [newStatus, id]
        );
      } else if (decision === 'rejected') {
        newStatus = 'Rejected';
        await client.query(
          "UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2",
          [newStatus, id]
        );
      } else if (decision === 'needs_changes') {
        newStatus = 'Draft';
        await client.query(
          "UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2",
          [newStatus, id]
        );
      }

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, 'REVIEW_SUBMISSION', 'submissions', id, JSON.stringify({
          decision,
          notes,
          previous_status: submissionCheck.rows[0].status,
          new_status: newStatus
        })]
      );

      // Log activity
      await client.query(
        `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, 'submission_reviewed', 'submissions', id, JSON.stringify({
          decision,
          notes,
          previous_status: submissionCheck.rows[0].status,
          new_status: newStatus
        })]
      );

      await client.query("COMMIT");

      res.json({
        message: "Submission reviewed successfully",
        submission: {
          id,
          status: newStatus,
          decision,
          reviewed_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Review submission error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to review submission",
        code: "REVIEW_SUBMISSION_FAILED",
        details: error.message
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Review submission error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to review submission",
      code: "REVIEW_SUBMISSION_FAILED"
    });
  }
};

export const forwardToClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized", message: "User ID is required" });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const updateResult = await client.query(
        `UPDATE submissions 
         SET status = 'Client Review', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );

      if (updateResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Not Found", message: "Submission not found" });
        return;
      }

      await writeAuditLog(
        userId,
        "UPDATE_SUBMISSION_STATUS",
        "submissions",
        id as string,
        { status: 'Client Review', forwarded_by: userId },
        req.ip as string | undefined
      );

      await client.query(
        `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'forwarded_to_client', 'submissions', $2, $3)`,
        [userId, id, JSON.stringify({ status: 'Client Review' })]
      );

      await client.query("COMMIT");
      res.json({ message: "Successfully forwarded to client", submission: updateResult.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Forward to client error:", error);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to forward candidate" });
  }
};

// Get submissions for client manager's clients
export const getSubmissionsForMyClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const status = req.query.status as string | undefined;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    const client = await getClient();
    try {
      // Build query with optional status filter
      let whereClause = "WHERE cl.owner_user_id = $1";
      const queryParams: any[] = [userId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereClause += ` AND s.status = $${paramCount}`;
        queryParams.push(status);
      }

      const query = `
        SELECT 
          s.id,
          s.job_id,
          s.candidate_id,
          SPLIT_PART(u.email, '@', 1) as submitted_by,
          s.status,
          s.rejection_reason,
          s.submitted_at,
          s.submitted_at as created_at,
          s.updated_at,
          j.title as job_title,
          j.description as job_description,
          j.location as job_location,
          cl.company_name,
          cand.full_name as candidate_name,
          cand.email as candidate_email,
          cand.phone as candidate_phone,
          EXTRACT(DAY FROM (NOW() - s.updated_at)) as days_in_stage
        FROM submissions s
        JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        JOIN candidates cand ON s.candidate_id = cand.id
        LEFT JOIN users u ON s.submitted_by = u.id
        ${whereClause}
        ORDER BY s.updated_at DESC
      `;

      const result = await client.query(query, queryParams);

      res.json({
        submissions: result.rows,
        count: result.rows.length
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get submissions for my clients error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch submissions for your clients",
      code: "FETCH_SUBMISSIONS_FAILED"
    });
  }
};

// Update submission client outcome (recorded on behalf of client)
export const updateSubmissionClientOutcome = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { outcome, notes }: ClientOutcomeRequest = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    // Validate outcome
    if (!outcome || !['shortlisted', 'rejected'].includes(outcome)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid outcome. Must be 'shortlisted' or 'rejected'",
        code: "INVALID_OUTCOME"
      });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Check if submission exists and belongs to user's clients
      const submissionCheck = await client.query(
        `SELECT s.*, j.client_id, c.owner_user_id
         FROM submissions s
         JOIN job_descriptions j ON s.job_id = j.id
         LEFT JOIN clients c ON j.client_id = c.id
         WHERE s.id = $1`,
        [id]
      );

      if (submissionCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({
          error: "Not Found",
          message: "Submission not found",
          code: "SUBMISSION_NOT_FOUND"
        });
        return;
      }

      const submission = submissionCheck.rows[0];

      // Verify client belongs to user (if job has a client)
      if (submission.client_id && submission.owner_user_id !== userId) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Forbidden",
          message: "You can only update outcomes for your own clients",
          code: "FORBIDDEN"
        });
        return;
      }

      // Map outcome to pipeline stage
      // TODO: Fetch from system_settings instead of hardcoding
      // This is a temporary mapping - should be replaced with dynamic lookup
      const pipelineStageMap: Record<string, string> = {
        'shortlisted': 'Shortlisted',
        'rejected': 'Rejected'
      };

      const newStatus = pipelineStageMap[outcome];
      if (!newStatus) {
        await client.query("ROLLBACK");
        res.status(400).json({
          error: "Bad Request",
          message: "Could not map outcome to pipeline stage",
          code: "INVALID_PIPELINE_STAGE"
        });
        return;
      }

      // Update submission status
      if (outcome === 'rejected') {
        await client.query(
          `UPDATE submissions 
           SET status = $1, rejection_reason = $2, updated_at = NOW() 
           WHERE id = $3`,
          [newStatus, notes || 'Rejected by client', id]
        );
      } else {
        await client.query(
          `UPDATE submissions 
           SET status = $1, rejection_reason = NULL, updated_at = NOW() 
           WHERE id = $2`,
          [newStatus, id]
        );
      }

      // Insert audit log with explicit "recordedOnBehalfOfClient" field - DISABLED (table might not exist or have different schema)
      // await client.query(
      //   `INSERT INTO audit_logs (action, table_name, record_id, user_id, tenant_id, created_at, details)
      //    VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      //   ['CLIENT_OUTCOME_RECORDED', 'submissions', id, userId, tenantId, JSON.stringify({
      //     outcome,
      //     notes,
      //     newStatus,
      //     previous_status: submission.status,
      //     // Explicit field indicating this was recorded on behalf of client
      //     // Easy to find and adjust once a real Client role exists
      //     recordedOnBehalfOfClient: true,
      //     recordedBy: userId,
      //     recordedByRole: 'client_manager'
      //   })]
      // );

      // Log activity - DISABLED (table might not exist or have different schema)
      // await client.query(
      //   `INSERT INTO activity_log (activity_type, related_id, user_id, tenant_id, created_at, details)
      //    VALUES ($1, $2, $3, $4, NOW(), $5)`,
      //   ['client_outcome_recorded', id, userId, tenantId, JSON.stringify({
      //     outcome,
      //     notes,
      //     newStatus,
      //     previous_status: submission.status,
      //     recordedOnBehalfOfClient: true
      //   })]
      // );

      await client.query("COMMIT");

      res.json({
        message: "Client outcome recorded successfully",
        submission: {
          id,
          status: newStatus,
          outcome,
          notes,
          updated_at: new Date().toISOString()
        }
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Update submission client outcome error:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to record client outcome",
        code: "UPDATE_OUTCOME_FAILED",
        details: error.message
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Update submission client outcome error (outer):", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to record client outcome",
      code: "UPDATE_OUTCOME_FAILED",
      details: error.message
    });
  }
};

// Get submission by ID
export const getSubmissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const submissionId = Array.isArray(id) ? id[0] : id;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    console.log('[getSubmissionById] Request received:', { submissionId, userId, userRole });

    if (!submissionId) {
      res.status(400).json({ error: "Submission ID is required" });
      return;
    }

    const client = await getClient();
    try {
      // Fetch submission with candidate and job details
      const query = `
        SELECT 
          s.id,
          s.job_id,
          s.candidate_id,
          s.submitted_by,
          s.status,
          s.rejection_reason,
          s.submitted_at,
          s.updated_at,
          c.full_name as candidate_name,
          c.email as candidate_email,
          c.phone as candidate_phone,
          c.years_experience as candidate_experience,
          j.title as job_title,
          j.department as job_department,
          j.location as job_location,
          cli.company_name as client_name,
          u.email as submitted_by_email
        FROM submissions s
        LEFT JOIN candidates c ON s.candidate_id = c.id
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cli ON j.client_id = cli.id
        LEFT JOIN users u ON s.submitted_by = u.id
        WHERE s.id = $1
      `;

      const result = await client.query(query, [submissionId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      const submission = result.rows[0];

      console.log('[getSubmissionById] Submission found:', submission.id);
      res.json({ submission });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Get submission by ID error:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch submission details",
      details: error.message
    });
  }
};

// Create Placement
export const createPlacement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: submissionId } = req.params;
    const { joining_date, placement_fee, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!submissionId) {
      res.status(400).json({ error: "Submission ID is required" });
      return;
    }

    if (!joining_date) {
      res.status(400).json({ error: "Joining date is required" });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Verify submission exists
      const subRes = await client.query("SELECT status, job_id, candidate_id FROM submissions WHERE id = $1", [submissionId]);
      if (subRes.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      // Look up client_id and recruiter_id from the job
      const jobRes = await client.query(
        "SELECT client_id, created_by_user_id FROM job_descriptions WHERE id = $1",
        [subRes.rows[0].job_id]
      );
      const clientId = jobRes.rows[0]?.client_id || null;
      const recruiterId = jobRes.rows[0]?.created_by_user_id || userId;

      // Create placement record — use columns available in the 028+073 schema
      const insertQuery = `
        INSERT INTO placements (
          id, submission_id, job_id, candidate_id, client_id, recruiter_id,
          billing_amount, joining_date, notes, created_by, status, placed_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9, 'active', NOW()
        )
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        submissionId,                      // $1 submission_id
        subRes.rows[0].job_id,             // $2 job_id
        subRes.rows[0].candidate_id,       // $3 candidate_id
        clientId,                          // $4 client_id
        recruiterId,                       // $5 recruiter_id
        placement_fee ? parseFloat(placement_fee) : 0,  // $6 billing_amount
        joining_date,                      // $7 joining_date
        notes || null,                     // $8 notes
        userId                             // $9 created_by
      ]);

      // Update submission status to 'Placed'
      await client.query("UPDATE submissions SET status = 'Placed', updated_at = NOW() WHERE id = $1", [submissionId]);

      await client.query("COMMIT");

      res.status(201).json({
        message: "Placement created successfully",
        placement: result.rows[0]
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Create placement error:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create placement",
      details: error.message
    });
  }
};
