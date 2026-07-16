import { Router } from "express";
import {
  getRecruiterSummary,
  getTeamLeadSummary,
  getClientManagerSummary,
  getAdminSummary,
} from "../controllers/dashboard.controller";
import { getBDMSummary } from "../controllers/client.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/dashboard/recruiter-summary:
 *   get:
 *     summary: Get recruiter summary for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignedRequirementsCount:
 *                   type: integer
 *                   description: Number of job requirements assigned to the recruiter
 *                 activeSubmissionsCount:
 *                   type: integer
 *                   description: Number of active submissions (not rejected/offer accepted)
 *                 upcomingInterviews:
 *                   type: array
 *                   description: Next 5 upcoming interviews
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       round_name:
 *                         type: string
 *                       scheduled_at:
 *                         type: string
 *                         format: date-time
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
 *                 dailyTarget:
 *                   type: integer
 *                   description: Daily submission target (placeholder - currently hardcoded to 5)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/recruiter-summary", getRecruiterSummary);

/**
 * @swagger
 * /api/dashboard/team-lead-summary:
 *   get:
 *     summary: Get team lead summary for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team lead summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 teamSize:
 *                   type: integer
 *                   description: Count of recruiters under the team lead
 *                 openRequirementsCount:
 *                   type: integer
 *                   description: Count of requirements assigned to the team with status not closed
 *                 pendingReviewsCount:
 *                   type: integer
 *                   description: Count of submissions pending review by the team lead
 *                 monthlyClosuresCount:
 *                   type: integer
 *                   description: Count of submissions that reached 'Offer Accepted' status this month
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/team-lead-summary", 
  requirePermission("team", "view_kpis"),
  getTeamLeadSummary
);

/**
 * @swagger
 * /api/dashboard/client-manager-summary:
 *   get:
 *     summary: Get client manager summary for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves summary statistics for the client manager's dashboard.
 *       All counts are scoped to the client manager's owned clients via the ownership chain.
 *     responses:
 *       200:
 *         description: Client manager summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignedClientsCount:
 *                   type: integer
 *                   description: Count of clients assigned to the client manager (owner_user_id = req.user.id)
 *                 openRequirementsCount:
 *                   type: integer
 *                   description: Count of open requirements for owned clients (status != 'closed')
 *                 pendingFeedbackCount:
 *                   type: integer
 *                   description: Count of submissions with status 'Shortlisted' (awaiting client decision)
 *                 followUpsDueCount:
 *                   type: integer
 *                   description: Count of communication follow-ups due (follow_up_date <= NOW() AND logged_by = req.user.id)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/client-manager-summary", getClientManagerSummary);

/**
 * @swagger
 * /api/dashboard/bdm-summary:
 *   get:
 *     summary: Get BDM summary for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves summary statistics for the BDM's dashboard.
 *       All counts are scoped to the BDM's owned clients and activities.
 *     responses:
 *       200:
 *         description: BDM summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newClientsThisMonth:
 *                   type: integer
 *                   description: Count of clients moved to 'won' stage this month by the BDM
 *                 openOpportunitiesCount:
 *                   type: integer
 *                   description: Count of clients in active pipeline stages (not won/lost)
 *                 revenueGeneratedThisMonth:
 *                   type: number
 *                   description: Total revenue from placements this month for BDM's clients
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/bdm-summary", 
  requirePermission("reports", "view_own"),
  getBDMSummary
);

/**
 * @swagger
 * /api/dashboard/admin-summary:
 *   get:
 *     summary: Get admin summary for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/admin-summary", getAdminSummary);

export default router;