import { Router } from "express";
import {
  createInterview,
  updateInterview,
  getUpcomingInterviews,
  addInterviewFeedback,
} from "../controllers/interview.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/interviews:
 *   post:
 *     summary: Schedule a new interview
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Schedules a new interview for a submission.
 *       Accessible to:
 *       - Users who submitted the submission
 *       - Users with interviews:schedule permission
 *       - Client managers for jobs belonging to their clients (ownership chain: submission → job → client → owner_user_id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - submission_id
 *               - round_name
 *               - scheduled_at
 *               - mode
 *             properties:
 *               submission_id:
 *                 type: string
 *                 format: uuid
 *                 description: Submission ID
 *               round_name:
 *                 type: string
 *                 description: Interview round name (e.g., "Technical Round", "HR Round")
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled interview time (must be in future)
 *               mode:
 *                 type: string
 *                 enum: [in-person, phone, video, on-site]
 *                 description: Interview mode
 *     responses:
 *       201:
 *         description: Interview scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 interview:
 *                   type: object
 *       400:
 *         description: Bad Request - Missing required fields or invalid date
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions or job not owned by client manager
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
router.post("/", requirePermission("interviews", "schedule"), createInterview);

/**
 * @swagger
 * /api/interviews/{id}:
 *   patch:
 *     summary: Update interview (reschedule or cancel)
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Updates an interview (reschedule or cancel).
 *       Accessible to:
 *       - Users who scheduled the interview
 *       - Users who submitted the submission
 *       - Users with interviews:schedule permission
 *       - Client managers for jobs belonging to their clients (ownership chain: interview → submission → job → client → owner_user_id)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Interview ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 description: New scheduled time (must be in future unless cancelling)
 *               status:
 *                 type: string
 *                 enum: [scheduled, cancelled, completed, no_show]
 *                 description: New interview status
 *     responses:
 *       200:
 *         description: Interview updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 interview:
 *                   type: object
 *       400:
 *         description: Bad Request - Invalid date, status, or missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions or job not owned by client manager
 *       404:
 *         description: Interview not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id", requirePermission("interviews", "schedule"), updateInterview);

/**
 * @swagger
 * /api/interviews/upcoming:
 *   get:
 *     summary: Get upcoming interviews for current user
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Upcoming interviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 interviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       round_name:
 *                         type: string
 *                       scheduled_at:
 *                         type: string
 *                       mode:
 *                         type: string
 *                       status:
 *                         type: string
 *                       job_title:
 *                         type: string
 *                       job_company:
 *                         type: string
 *                       candidate_name:
 *                         type: string
 *                       candidate_email:
 *                         type: string
 *                       scheduled_by_name:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *                     total_items:
 *                       type: integer
 *                     items_per_page:
 *                       type: integer
 *                     has_next_page:
 *                       type: boolean
 *                     has_prev_page:
 *                       type: boolean
 *       400:
 *         description: Bad Request - Invalid pagination parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions - requirePermission("interviews", "view_own")
 *       500:
 *         description: Internal server error
 */
router.get("/upcoming", requirePermission("interviews", "view_own"), getUpcomingInterviews);

/**
 * @swagger
 * /api/interviews/{id}/feedback:
 *   post:
 *     summary: Add feedback to an interview
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Adds feedback to an interview.
 *       Accessible to:
 *       - Users who scheduled the interview
 *       - Users who submitted the submission
 *       - Users with interviews:view_own permission
 *       - Client managers for jobs belonging to their clients (ownership chain: interview → submission → job → client → owner_user_id)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Interview ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outcome
 *             properties:
 *               outcome:
 *                 type: string
 *                 enum: [pass, fail, no_show, pending]
 *                 description: Interview outcome
 *               notes:
 *                 type: string
 *                 description: Interview notes
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Interview rating (1-5)
 *     responses:
 *       201:
 *         description: Interview feedback added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 feedback:
 *                   type: object
 *       400:
 *         description: Bad Request - Invalid outcome, rating, or missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions or job not owned by client manager
 *       404:
 *         description: Interview not found
 *       409:
 *         description: Conflict - Feedback already exists
 *       500:
 *         description: Internal server error
 */
router.post("/:id/feedback", requirePermission("interviews", "view_own"), addInterviewFeedback);

export default router;