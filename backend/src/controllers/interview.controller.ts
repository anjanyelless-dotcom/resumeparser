import { Request, Response } from "express";
import { getClient } from "../database/db";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

// Helper function to check if user has a specific permission
async function hasRolePermission(
  client: any,
  userId: string,
  tenantId: string,
  moduleName: string,
  actionName: string
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     JOIN roles r ON rp.role_id = r.id
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND p.module_name = $2 AND p.action_name = $3`,
    [userId, moduleName, actionName]
  );
  return result.rows.length > 0;
}

// Helper function to check if user is a client_manager
async function isClientManager(client: any, userId: string): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND r.name = 'client_manager'`,
    [userId]
  );
  return result.rows.length > 0;
}

// Types
interface CreateInterviewRequest {
  submission_id: string;
  round_name: string;
  scheduled_at: string;
  mode: string;
}

interface UpdateInterviewRequest {
  scheduled_at?: string;
  status?: string;
}

interface InterviewFeedbackRequest {
  outcome: string;
  notes?: string;
  rating?: number;
}

interface Interview {
  id: string;
  submission_id: string;
  round_name: string;
  scheduled_at: string;
  mode: string;
  status: string;
  scheduled_by: string;
  created_at: string;
  updated_at: string;
}

// Create interview
export const createInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submission_id, round_name, scheduled_at, mode }: CreateInterviewRequest = req.body;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id || "default";

    // Validate required fields
    if (!submission_id || !round_name || !scheduled_at || !mode) {
      res.status(400).json({
        error: "Bad Request",
        message: "submission_id, round_name, scheduled_at, and mode are required",
        code: "MISSING_REQUIRED_FIELDS"
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

    // Validate scheduled_at is a valid date and in the future
    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      res.status(400).json({
        error: "Bad Request",
        message: "scheduled_at must be a valid date",
        code: "INVALID_DATE"
      });
      return;
    }

    if (scheduledDate <= new Date()) {
      res.status(400).json({
        error: "Bad Request",
        message: "scheduled_at must be in the future",
        code: "PAST_DATE"
      });
      return;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Verify submission exists and user has permission
      const submissionCheck = await client.query(
        `SELECT s.*, j.title as job_title, c.full_name as candidate_name, j.client_id, cl.owner_user_id
         FROM submissions s
         LEFT JOIN job_descriptions j ON s.job_id = j.id
         LEFT JOIN candidates c ON s.candidate_id = c.id
         LEFT JOIN clients cl ON j.client_id = cl.id
         WHERE s.id = $1`,
        [submission_id]
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

      // Enforce Phase 3: Only Client Approved submissions can have an interview created
      const currentStatus = (submission.status || '').toLowerCase().replace(/ /g, '_');
      if (!['client_approved', 'shortlisted', 'shortlisted_by_client', 'interviewing', 'interview_passed'].includes(currentStatus)) {
        await client.query("ROLLBACK");
        res.status(400).json({
          error: "Bad Request",
          message: "Interviews can only be scheduled for 'Client Approved', 'Shortlisted', or 'Interviewing' candidates",
          code: "INVALID_SUBMISSION_STATUS"
        });
        return;
      }

      // Check if user has permission:
      // 1. User submitted the submission
      // 2. User has interviews:schedule permission
      // 3. User is a client_manager and the job belongs to their clients
      const hasPermission =
        submission.submitted_by === userId ||
        await hasRolePermission(client, userId, tenantId, 'interviews', 'schedule') ||
        (await isClientManager(client, userId) && submission.owner_user_id === userId);

      if (!hasPermission) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Forbidden",
          message: "Insufficient permissions to schedule this interview",
          code: "FORBIDDEN"
        });
        return;
      }

      // Create interview
      const interviewResult = await client.query(
        `INSERT INTO interviews (submission_id, round_name, scheduled_at, mode, status, scheduled_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'scheduled', $5, NOW(), NOW())
         RETURNING *`,
        [submission_id, round_name, scheduled_at, mode, userId]
      );

      const interview = interviewResult.rows[0];

      // Update submission status to 'Interviewing'
      await client.query(
        `UPDATE submissions 
         SET status = 'Interviewing', updated_at = NOW() 
         WHERE id = $1`,
        [submission_id]
      );

      // Insert activity log
      await client.query(
        `INSERT INTO activity_log (action, entity_id, entity_type, user_id, created_at, details)
         VALUES ('interview_scheduled', $1, 'interview', $2, NOW(), $3)`,
        [interview.id, userId, JSON.stringify({
          submission_id,
          round_name,
          scheduled_at,
          mode,
          candidate_name: submissionCheck.rows[0].candidate_name,
          job_title: submissionCheck.rows[0].job_title
        })]
      );

      // Insert audit log
      await client.query(
        `INSERT INTO audit_logs (action, table_name, record_id, user_id, created_at, new_values)
         VALUES ('CREATE_INTERVIEW', 'interviews', $1, $2, NOW(), $3)`,
        [interview.id, userId, JSON.stringify({
          submission_id,
          round_name,
          scheduled_at,
          mode,
          status: 'scheduled'
        })]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Interview scheduled successfully",
        interview
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create interview error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to schedule interview",
        code: "CREATE_INTERVIEW_FAILED"
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create interview error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to schedule interview",
      code: "CREATE_INTERVIEW_FAILED"
    });
  }
};

// Update interview (reschedule or cancel)
export const updateInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { scheduled_at, status }: UpdateInterviewRequest = req.body;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id || "default";

    if (!id) {
      res.status(400).json({
        error: "Bad Request",
        message: "Interview ID is required",
        code: "MISSING_INTERVIEW_ID"
      });
      return;
    }

    if (!scheduled_at && !status) {
      res.status(400).json({
        error: "Bad Request",
        message: "Either scheduled_at or status must be provided",
        code: "MISSING_UPDATE_FIELDS"
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

      // Check if interview exists and user has permission
      const existingInterview = await client.query(
        `SELECT i.*, s.submitted_by, s.job_id, j.client_id, cl.owner_user_id
         FROM interviews i
         JOIN submissions s ON i.submission_id = s.id
         JOIN job_descriptions j ON s.job_id = j.id
         LEFT JOIN clients cl ON j.client_id = cl.id
         WHERE i.id = $1`,
        [id]
      );

      if (existingInterview.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({
          error: "Not Found",
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND"
        });
        return;
      }

      const interviewData = existingInterview.rows[0];

      // Check if user has permission:
      // 1. User scheduled the interview
      // 2. User submitted the submission
      // 3. User has interviews:schedule permission
      // 4. User is a client_manager and the job belongs to their clients
      const hasPermission = 
        interviewData.scheduled_by === userId ||
        interviewData.submitted_by === userId ||
        await hasRolePermission(client, userId, tenantId, 'interviews', 'schedule') ||
        (await isClientManager(client, userId) && interviewData.owner_user_id === userId);

      if (!hasPermission) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Forbidden",
          message: "Insufficient permissions to update this interview",
          code: "FORBIDDEN"
        });
        return;
      }

      // Build update query
      const updateFields = [];
      const queryParams = [id];
      let paramIndex = 2;

      if (scheduled_at) {
        // Validate scheduled_at
        const scheduledDate = new Date(scheduled_at);
        if (isNaN(scheduledDate.getTime())) {
          await client.query("ROLLBACK");
          res.status(400).json({
            error: "Bad Request",
            message: "scheduled_at must be a valid date",
            code: "INVALID_DATE"
          });
          return;
        }

        if (status !== 'cancelled' && scheduledDate <= new Date()) {
          await client.query("ROLLBACK");
          res.status(400).json({
            error: "Bad Request",
            message: "scheduled_at must be in the future",
            code: "PAST_DATE"
          });
          return;
        }

        updateFields.push(`scheduled_at = $${paramIndex}`);
        queryParams.push(scheduled_at);
        paramIndex++;
      }

      if (status) {
        const validStatuses = ['scheduled', 'cancelled', 'completed', 'no_show'];
        if (!validStatuses.includes(status)) {
          await client.query("ROLLBACK");
          res.status(400).json({
            error: "Bad Request",
            message: "Invalid status. Must be one of: " + validStatuses.join(", "),
            code: "INVALID_STATUS"
          });
          return;
        }

        updateFields.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      updateFields.push(`updated_at = NOW()`);

      const updateQuery = `
        UPDATE interviews 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, queryParams);
      const updatedInterview = updateResult.rows[0];

      // Insert audit log
      await client.query(
        `INSERT INTO audit_logs (action, table_name, record_id, user_id, created_at, new_values)
         VALUES ('UPDATE_INTERVIEW', 'interviews', $1, $2, NOW(), $3)`,
        [id, userId, JSON.stringify({
          old_status: existingInterview.rows[0].status,
          new_status: updatedInterview.status,
          old_scheduled_at: existingInterview.rows[0].scheduled_at,
          new_scheduled_at: updatedInterview.scheduled_at
        })]
      );

      await client.query("COMMIT");

      res.json({
        message: "Interview updated successfully",
        interview: updatedInterview
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Update interview error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update interview",
        code: "UPDATE_INTERVIEW_FAILED"
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update interview error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update interview",
      code: "UPDATE_INTERVIEW_FAILED"
    });
  }
};

// Get upcoming interviews for the current user
export const getUpcomingInterviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id || "default";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

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

      // Check if interviews table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'interviews'
        )
      `);

      if (!tableCheck.rows[0].exists) {
        // Interviews table doesn't exist yet, return empty response
        res.json({
          interviews: [],
          pagination: {
            current_page: page,
            total_pages: 0,
            total_items: 0,
            items_per_page: limit,
            has_next_page: false,
            has_prev_page: false
          }
        });
        return;
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM interviews i
        JOIN submissions s ON i.submission_id = s.id
        WHERE (i.scheduled_by = $1 OR s.submitted_by = $1) 
        AND i.scheduled_at > NOW() 
        AND i.status = 'scheduled'
      `;
      const countResult = await client.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated upcoming interviews with details
      const interviewsQuery = `
        SELECT 
          i.*,
          s.job_id,
          s.candidate_id,
          j.title as job_title,
          cl.company_name as job_company,
          c.full_name as candidate_name,
          c.email as candidate_email,
          u.email as scheduled_by_name
        FROM interviews i
        JOIN submissions s ON i.submission_id = s.id
        LEFT JOIN job_descriptions j ON s.job_id = j.id
        LEFT JOIN clients cl ON j.client_id = cl.id
        LEFT JOIN candidates c ON s.candidate_id = c.id
        LEFT JOIN users u ON i.scheduled_by = u.id
        WHERE (i.scheduled_by = $1 OR s.submitted_by = $1) 
        AND i.scheduled_at > NOW() 
        AND i.status = 'scheduled'
        ORDER BY i.scheduled_at ASC
        LIMIT $2 OFFSET $3
      `;

      const interviewsResult = await client.query(interviewsQuery, [userId, limit, offset]);
      const interviews = interviewsResult.rows;

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        interviews,
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
    console.error("Get upcoming interviews error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch upcoming interviews",
      code: "GET_UPCOMING_INTERVIEWS_FAILED"
    });
  }
};

// Add interview feedback
export const addInterviewFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { outcome, notes, rating }: InterviewFeedbackRequest = req.body;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id || "default";

    if (!id) {
      res.status(400).json({
        error: "Bad Request",
        message: "Interview ID is required",
        code: "MISSING_INTERVIEW_ID"
      });
      return;
    }

    if (!outcome) {
      res.status(400).json({
        error: "Bad Request",
        message: "outcome is required",
        code: "MISSING_OUTCOME"
      });
      return;
    }

    const validOutcomes = ['pass', 'fail', 'no_show', 'pending'];
    if (!validOutcomes.includes(outcome)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid outcome. Must be one of: " + validOutcomes.join(", "),
        code: "INVALID_OUTCOME"
      });
      return;
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Rating must be between 1 and 5",
        code: "INVALID_RATING"
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

      // Check if interview exists and user has permission
      const existingInterview = await client.query(
        `SELECT i.*, s.job_id, s.candidate_id, s.submitted_by, j.client_id, cl.owner_user_id
         FROM interviews i
         JOIN submissions s ON i.submission_id = s.id
         JOIN job_descriptions j ON s.job_id = j.id
         LEFT JOIN clients cl ON j.client_id = cl.id
         WHERE i.id = $1`,
        [id]
      );

      if (existingInterview.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({
          error: "Not Found",
          message: "Interview not found",
          code: "INTERVIEW_NOT_FOUND"
        });
        return;
      }

      const interviewData = existingInterview.rows[0];

      // Check if user has permission:
      // 1. User scheduled the interview
      // 2. User submitted the submission
      // 3. User has interviews:view_own permission
      // 4. User is a client_manager and the job belongs to their clients
      const hasPermission = 
        interviewData.scheduled_by === userId ||
        interviewData.submitted_by === userId ||
        await hasRolePermission(client, userId, tenantId, 'interviews', 'view_own') ||
        (await isClientManager(client, userId) && interviewData.owner_user_id === userId);

      if (!hasPermission) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Forbidden",
          message: "Insufficient permissions to add feedback for this interview",
          code: "FORBIDDEN"
        });
        return;
      }

      // Check if feedback already exists
      const existingFeedback = await client.query(
        "SELECT id FROM interview_feedback WHERE interview_id = $1",
        [id]
      );

      if (existingFeedback.rows.length > 0) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Conflict",
          message: "Feedback already exists for this interview",
          code: "FEEDBACK_EXISTS"
        });
        return;
      }

      // Insert feedback
      const feedbackResult = await client.query(
        `INSERT INTO interview_feedback (interview_id, outcome, notes, rating, given_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [id, outcome, notes || null, rating || null, userId]
      );

      const feedback = feedbackResult.rows[0];

      // Update interview status
      await client.query(
        `UPDATE interviews 
         SET status = 'completed', updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      // Update submission status based on outcome
      if (outcome === 'pass') {
        await client.query(
          `UPDATE submissions 
           SET status = 'Interview Passed', updated_at = NOW() 
           WHERE id = $1`,
          [existingInterview.rows[0].submission_id]
        );
      } else if (outcome === 'fail') {
        await client.query(
          `UPDATE submissions 
           SET status = 'Rejected', updated_at = NOW() 
           WHERE id = $1`,
          [existingInterview.rows[0].submission_id]
        );
      }

      // Insert activity log
      await client.query(
        `INSERT INTO activity_log (action, entity_id, entity_type, user_id, created_at, details)
         VALUES ('interview_feedback', $1, 'interview', $2, NOW(), $3)`,
        [id, userId, JSON.stringify({
          outcome,
          notes,
          rating,
          interview_id: id
        })]
      );

      // Insert audit log
      await client.query(
        `INSERT INTO audit_logs (action, table_name, record_id, user_id, created_at, new_values)
         VALUES ('CREATE_INTERVIEW_FEEDBACK', 'interview_feedback', $1, $2, NOW(), $3)`,
        [feedback.id, userId, JSON.stringify({
          interview_id: id,
          outcome,
          notes,
          rating
        })]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Interview feedback added successfully",
        feedback
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Add interview feedback error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to add interview feedback",
        code: "ADD_INTERVIEW_FEEDBACK_FAILED"
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Add interview feedback error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to add interview feedback",
      code: "ADD_INTERVIEW_FEEDBACK_FAILED"
    });
  }
};