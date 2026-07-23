import { Router } from "express";
import {
  getTeamLeadRequirements,
  getTeamKPIs,
} from "../controllers/team.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/team-lead/requirements:
 *   get:
 *     summary: Get requirements for team lead
 *     tags: [Team Lead]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Requirements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requirements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       department:
 *                         type: string
 *                       location:
 *                         type: string
 *                       status:
 *                         type: string
 *                       assigned_recruiter_count:
 *                         type: integer
 *                       my_team_recruiter_count:
 *                         type: integer
 *                       is_my_team:
 *                         type: boolean
 *                       is_unassigned:
 *                         type: boolean
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
 *         description: Forbidden - user is not a team lead or admin
 *       500:
 *         description: Internal server error
 */
router.get("/requirements", requirePermission("team_requirements", "view"), getTeamLeadRequirements);

/**
 * @swagger
 * /api/team/kpis:
 *   get:
 *     summary: Get team KPIs for team lead
 *     tags: [Team Lead]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for KPI calculations (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for KPI calculations (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Team KPIs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kpis:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recruiter_id:
 *                         type: string
 *                       recruiter_email:
 *                         type: string
 *                       recruiter_name:
 *                         type: string
 *                       submissions_count:
 *                         type: integer
 *                       active_submissions_count:
 *                         type: integer
 *                       total_reviews:
 *                         type: integer
 *                       approved_reviews:
 *                         type: integer
 *                       approval_rate:
 *                         type: number
 *                       interviews_count:
 *                         type: integer
 *                       total_activities:
 *                         type: integer
 *                       activity_breakdown:
 *                         type: object
 *                         properties:
 *                           submissions_created:
 *                             type: integer
 *                           submissions_reviewed:
 *                             type: integer
 *                           interviews_scheduled:
 *                             type: integer
 *                           candidates_created:
 *                             type: integer
 *                           jobs_created:
 *                             type: integer
 *                 team_totals:
 *                   type: object
 *                   properties:
 *                     total_submissions:
 *                       type: integer
 *                     total_active_submissions:
 *                       type: integer
 *                     total_reviews:
 *                       type: integer
 *                     total_approved_reviews:
 *                       type: integer
 *                     approval_rate:
 *                       type: number
 *                     total_interviews:
 *                       type: integer
 *                     total_activities:
 *                       type: integer
 *                     recruiter_count:
 *                       type: integer
 *                     total_activity_breakdown:
 *                       type: object
 *                       properties:
 *                         submissions_created:
 *                           type: integer
 *                         submissions_reviewed:
 *                           type: integer
 *                         interviews_scheduled:
 *                           type: integer
 *                         candidates_created:
 *                           type: integer
 *                         jobs_created:
 *                           type: integer
 *                 date_range:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user is not a team lead or admin
 *       500:
 *         description: Internal server error
 */
router.get("/kpis", requirePermission("team_kpis", "view"), getTeamKPIs);

export default router;