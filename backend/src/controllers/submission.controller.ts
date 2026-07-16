import { Request, Response } from "express";
import { getClient } from "../database/db";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

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
         VALUES ($1, $2, $3, 'Submitted', NOW(), NOW())
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

      // Insert audit log - DISABLED (table might not exist or have different schema)
      // await client.query(
      //   `INSERT INTO audit_logs (action, table_name, record_id, user_id, tenant_id, created_at, details)
      //    VALUES ('CREATE_SUBMISSION', 'submissions', $1, $2, $3, NOW(), $4)`,
      //   [submission.id, userId, tenantId, JSON.stringify({
      //     job_id,
      //     candidate_id,
      //     status: 'submitted'
      //   })]
      // );

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
        whereClause += ` AND s.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
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
          c.full_name as candidate_name,
          c.email as candidate_email,
          u.email as submitted_by_email
        FROM submissions s
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN candidates c ON s.candidate_id = c.id
        LEFT JOIN users u ON s.submitted_by = u.id
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log('[getMySubmissions] Request:', { userId, page, limit });

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

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM submissions s
        WHERE s.submitted_by = $1
      `;
      const countResult = await client.query(countQuery, [userId]);
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
        WHERE s.submitted_by = $1
        ORDER BY s.submitted_at DESC
        LIMIT $2 OFFSET $3
      `;

      const submissionsResult = await client.query(submissionsQuery, [userId, limit, offset]);
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

    if (!status) {
      res.status(400).json({
        error: "Bad Request",
        message: "Status is required",
        code: "MISSING_STATUS"
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

      // Check if submission exists
      const existingSubmission = await client.query(
        "SELECT * FROM submissions WHERE id = $1",
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

      // Update submission status
      const updateFields = ["status = $2", "updated_at = NOW()"];
      const queryParams = [id, status];
      let paramIndex = 3;

      if (rejectionReason) {
        updateFields.push(`rejection_reason = $${paramIndex}`);
        queryParams.push(rejectionReason);
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

      // Insert audit log - DISABLED (table might not exist or have different schema)
      // await client.query(
      //   `INSERT INTO audit_logs (action, table_name, record_id, user_id, tenant_id, created_at, details)
      //    VALUES ('UPDATE_SUBMISSION', 'submissions', $1, $2, $3, NOW(), $4)`,
      //   [id, userId, tenantId, JSON.stringify({
      //     old_status: existingSubmission.rows[0].status,
      //     new_status: status,
      //     rejection_reason: rejectionReason
      //   })]
      // );

      await client.query("COMMIT");

      res.json({
        message: "Submission status updated successfully",
        submission
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Update submission status error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update submission status",
        code: "UPDATE_SUBMISSION_STATUS_FAILED"
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
    const offset = (page - 1) * limit;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    // Only team leads and admins can access this endpoint
    if (userRole !== 'team_lead' && userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only team leads and admins can view pending reviews",
        code: "INSUFFICIENT_PERMISSIONS"
      });
      return;
    }

    const client = await getClient();
    try {
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
          u.first_name || ' ' || u.last_name as submitted_by_name,
          -- Check if submission has been reviewed
          EXISTS (
            SELECT 1 FROM submission_reviews sr 
            WHERE sr.submission_id = s.id
          ) as has_review
        FROM submissions s
        JOIN job_descriptions j ON s.job_id = j.id
        JOIN clients cli ON j.client_id = cli.id
        JOIN candidates c ON s.candidate_id = c.id
        JOIN users u ON s.submitted_by = u.id
        LEFT JOIN job_recruiter_assignments jra ON j.id = jra.job_id
        LEFT JOIN users recruiters ON jra.recruiter_id = recruiters.id
        WHERE s.status NOT IN ('rejected', 'offer_accepted', 'offer_declined')
      `;

      const params: any[] = [];
      let paramCount = 0;

      // Team lead filtering logic
      if (userRole === 'team_lead') {
        query += `
          AND (
            -- Show submissions for jobs assigned to team lead's recruiters
            EXISTS (
              SELECT 1 FROM job_recruiter_assignments jra2
              JOIN users recruiters2 ON jra2.recruiter_id = recruiters2.id
              WHERE jra2.job_id = j.id AND recruiters2.team_lead_id = $1
            )
          )
        `;
        params.push(userId);
        paramCount = 1;
      }
      // Admins see all pending submissions (no additional filtering needed)

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

      if (userRole === 'team_lead') {
        countQuery += `
          AND EXISTS (
            SELECT 1 FROM job_recruiter_assignments jra2
            JOIN users recruiters2 ON jra2.recruiter_id = recruiters2.id
            WHERE jra2.job_id = j.id AND recruiters2.team_lead_id = $1
          )
        `;
        countParams.push(userId);
        countParamCount = 1;
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
          newStatus = 'under_review';
        }

        await client.query(
          "UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2",
          [newStatus, id]
        );
      }

      // Log audit trail - DISABLED (table might not exist or have different schema)
      // await client.query(
      //   `INSERT INTO audit_logs (action, table_name, record_id, user_id, tenant_id, created_at, details)
      //    VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      //   ['REVIEW_SUBMISSION', 'submissions', id, userId, tenantId, JSON.stringify({
      //     decision,
      //     notes,
      //     previous_status: submissionCheck.rows[0].status,
      //     new_status: newStatus
      //   })]
      // );

      // Log activity - DISABLED (table might not exist or have different schema)
      // await client.query(
      //   `INSERT INTO activity_log (activity_type, related_id, user_id, tenant_id, created_at, details)
      //    VALUES ($1, $2, $3, $4, NOW(), $5)`,
      //   ['submission_reviewed', id, userId, tenantId, JSON.stringify({
      //     decision,
      //     notes,
      //     previous_status: submissionCheck.rows[0].status,
      //     new_status: newStatus
      //   })]
      // );

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

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Review submission error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to review submission",
        code: "REVIEW_SUBMISSION_FAILED"
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
          s.submitted_by,
          s.status,
          s.rejection_reason,
          s.submitted_at,
          s.updated_at,
          j.title as job_title,
          j.description as job_description,
          j.location as job_location,
          cand.full_name as candidate_name,
          cand.email as candidate_email,
          cand.phone as candidate_phone
        FROM submissions s
        JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        JOIN candidates cand ON s.candidate_id = cand.id
        ${whereClause}
        ORDER BY s.submitted_at DESC
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
