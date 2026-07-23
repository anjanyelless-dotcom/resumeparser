import { Router } from "express";
import {
  createSubmission,
  getSubmissions,
  getMySubmissions,
  updateSubmissionStatus,
  getPendingReviewSubmissions,
  reviewSubmission,
  getSubmissionsForMyClients,
  updateSubmissionClientOutcome,
  getSubmissionById,
  forwardToClient,
} from "../controllers/submission.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Create a new submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - job_id
 *               - candidate_id
 *             properties:
 *               job_id:
 *                 type: string
 *                 format: uuid
 *                 description: Job ID
 *               candidate_id:
 *                 type: string
 *                 format: uuid
 *                 description: Candidate ID
 *     responses:
 *       201:
 *         description: Submission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 submission:
 *                   type: object
 *       400:
 *         description: Bad Request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions - requirePermission("submissions", "create")
 *       404:
 *         description: Job or Candidate not found
 *       409:
 *         description: Conflict - Submission already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", requirePermission("submissions", "create"), createSubmission);

/**
 * @swagger
 * /api/submissions:
 *   get:
 *     summary: Get list of submissions with optional filters
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by job ID
 *       - in: query
 *         name: candidateId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by candidate ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, under_review, accepted, rejected]
 *         description: Filter by status
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
 *         description: Submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
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
 *         description: Insufficient permissions - requirePermission("submissions", "view")
 *       500:
 *         description: Internal server error
 */
router.get("/", requirePermission("submissions", "view"), getSubmissions);

/**
 * @swagger
 * /api/submissions/my:
 *   get:
 *     summary: Get submissions submitted by current user
 *     tags: [Submissions]
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
 *         description: User's submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
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
 *         description: Insufficient permissions - requirePermission("submissions", "view_own")
 *       500:
 *         description: Internal server error
 */
router.get("/my", requirePermission("submissions", "view_own"), getMySubmissions);

/**
 * @swagger
 * /api/submissions/pending-review:
 *   get:
 *     summary: Get submissions pending review for team lead
 *     tags: [Submissions]
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
 *         description: Pending review submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only team leads and admins can access
 *       500:
 *         description: Internal server error
 */
router.get("/pending-review", requirePermission("submissions", "review"), getPendingReviewSubmissions);

/**
 * @swagger
 * /api/submissions/for-my-clients:
 *   get:
 *     summary: Get submissions for client manager's clients
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by submission status
 *     responses:
 *       200:
 *         description: Submissions for client's jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions - requirePermission("submissions", "view_own_clients")
 *       500:
 *         description: Internal server error
 */
router.get("/for-my-clients", requirePermission("submissions", "view_own_clients"), getSubmissionsForMyClients);

/**
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get submission by ID
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     job_id:
 *                       type: string
 *                     candidate_id:
 *                       type: string
 *                     candidate_name:
 *                       type: string
 *                     candidate_email:
 *                       type: string
 *                     job_title:
 *                       type: string
 *                     client_name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     submitted_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions - requirePermission("submissions", "view")
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", requirePermission("submissions", "view"), getSubmissionById);

/**
 * @swagger
 * /api/submissions/{id}/status:
 *   patch:
 *     summary: Update submission status
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [submitted, under_review, accepted, rejected]
 *                 description: New status
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection (required when status is 'rejected')
 *     responses:
 *       200:
 *         description: Submission status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 submission:
 *                   type: object
 *       400:
 *         description: Bad Request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions - requirePermission("submissions", "edit")
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/status", requirePermission("submissions", "edit"), updateSubmissionStatus);

/**
 * @swagger
 * /api/submissions/pending-review:
 *   post:
 *     summary: Review a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approved, rejected, needs_changes]
 *                 description: Review decision
 *               notes:
 *                 type: string
 *                 description: Review notes
 *     responses:
 *       200:
 *         description: Submission reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 submission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     decision:
 *                       type: string
 *                     reviewed_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad Request - Invalid decision
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Submission not found
 *       409:
 *         description: Conflict - Submission already reviewed
 *       500:
 *         description: Internal server error
 */
router.post("/:id/review", requirePermission("submissions", "review"), reviewSubmission);

/**
 * @swagger
 * /api/submissions/{id}/client-outcome:
 *   patch:
 *     summary: Record client outcome for a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Records the client's outcome for a submission (shortlisted or rejected).
 *       This endpoint is used by Client Managers standing in for actual Client logins.
 *       The field name "recordedOnBehalfOfClient" in the audit log makes it explicit
 *       that this was recorded on behalf of a client, making it easy to find and adjust
 *       once a real Client role exists.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
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
 *                 enum: [shortlisted, rejected]
 *                 description: Client's decision on the candidate
 *               notes:
 *                 type: string
 *                 description: Optional notes about the decision
 *     responses:
 *       200:
 *         description: Client outcome recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 submission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       description: Mapped pipeline stage (e.g., 'Shortlisted', 'Rejected')
 *                     outcome:
 *                       type: string
 *                       enum: [shortlisted, rejected]
 *                     notes:
 *                       type: string
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad Request - Invalid outcome or mapping
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Submission not from your clients
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/client-outcome", requirePermission("submissions", "view_own_clients"), updateSubmissionClientOutcome);

/**
 * @swagger
 * /api/submissions/{id}/forward-client:
 *   post:
 *     summary: Forward a candidate to the client
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id/forward-client", requirePermission("submissions", "review"), forwardToClient);

export default router;