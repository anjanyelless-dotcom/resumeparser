import { Router } from "express";
import {
  getParsingStats,
  getSkillDistribution,
  getMetrics,
  getUploadTrends,
  getRecruiterActivity,
  getAccuracyOverview,
  exportCSV,
  exportPDF,
  getClientPerformance,
  getPlacements,
  getRevenue,
  getTeamClosures,
  getSubmissionSuccessRate,
  getNewClientsAcquired,
  getRevenueGenerated,
  getOpenOpportunities,
  getClientManagerSummary,
} from "../controllers/analytics.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Protect all analytics endpoints with token authentication
router.use(authenticateToken);

// Analytics endpoints - all require analytics:view permission
router.get("/parsing-stats", requirePermission("analytics", "view"), getParsingStats);
router.get("/skill-distribution", requirePermission("analytics", "view"), getSkillDistribution);
router.get("/metrics", requirePermission("analytics", "view"), getMetrics);
router.get("/upload-trends", requirePermission("analytics", "view"), getUploadTrends);
router.get("/recruiter-activity", requirePermission("analytics", "view"), getRecruiterActivity);
router.get("/export/csv", requirePermission("analytics", "view"), exportCSV);
router.get("/export/pdf", requirePermission("analytics", "view"), exportPDF);

// Accuracy overview endpoint
router.get("/overview", requirePermission("analytics", "view"), getAccuracyOverview);

/**
 * @swagger
 * /api/analytics/client-performance:
 *   get:
 *     summary: Get client performance analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter placements from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter placements to this date (YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Client performance data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   client_id:
 *                     type: string
 *                     format: uuid
 *                     description: Client ID
 *                   company_name:
 *                     type: string
 *                     description: Company name
 *                   total_placements:
 *                     type: integer
 *                     description: Total number of placements
 *                   total_revenue:
 *                     type: number
 *                     description: Total revenue from placements
 *                   avg_revenue_per_placement:
 *                     type: number
 *                     description: Average revenue per placement
 *                   unique_jobs_filled:
 *                     type: integer
 *                     description: Number of unique jobs filled
 *                   unique_recruiters_used:
 *                     type: integer
 *                     description: Number of unique recruiters used
 *                   first_placement_date:
 *                     type: string
 *                     format: date
 *                     description: Date of first placement
 *                   last_placement_date:
 *                     type: string
 *                     format: date
 *                     description: Date of last placement
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/client-performance", requirePermission("analytics", "view"), getClientPerformance);

/**
 * @swagger
 * /api/analytics/placements:
 *   get:
 *     summary: Get placements analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter placements from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter placements to this date (YYYY-MM-DD format)
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific client ID
 *       - in: query
 *         name: recruiterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific recruiter ID
 *     responses:
 *       200:
 *         description: Placements data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   placement_id:
 *                     type: string
 *                     format: uuid
 *                     description: Placement ID
 *                   client_id:
 *                     type: string
 *                     format: uuid
 *                     description: Client ID
 *                   company_name:
 *                     type: string
 *                     description: Company name
 *                   job_id:
 *                     type: string
 *                     format: uuid
 *                     description: Job ID
 *                   job_title:
 *                     type: string
 *                     description: Job title
 *                   candidate_id:
 *                     type: string
 *                     format: uuid
 *                     description: Candidate ID
 *                   candidate_name:
 *                     type: string
 *                     description: Candidate name
 *                   recruiter_id:
 *                     type: string
 *                     format: uuid
 *                     description: Recruiter ID
 *                   recruiter_name:
 *                     type: string
 *                     description: Recruiter name
 *                   placed_at:
 *                     type: string
 *                     format: date
 *                     description: Placement date
 *                   billing_amount:
 *                     type: number
 *                     description: Billing amount
 *                   placement_type:
 *                     type: string
 *                     description: Type of placement
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/placements", requirePermission("analytics", "view"), getPlacements);

/**
 * @swagger
 * /api/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter revenue from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter revenue to this date (YYYY-MM-DD format)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: month
 *         description: Group revenue by time period
 *     responses:
 *       200:
 *         description: Revenue data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_revenue:
 *                   type: number
 *                   description: Total revenue in the period
 *                 average_revenue_per_placement:
 *                   type: number
 *                   description: Average revenue per placement
 *                 total_placements:
 *                   type: integer
 *                   description: Total number of placements
 *                 revenue_by_period:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                         description: Time period (e.g., "2024-01" for month)
 *                       revenue:
 *                         type: number
 *                         description: Revenue in this period
 *                       placements:
 *                         type: integer
 *                         description: Number of placements in this period
 *                 revenue_by_client:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       client_id:
 *                         type: string
 *                         format: uuid
 *                         description: Client ID
 *                       company_name:
 *                         type: string
 *                         description: Company name
 *                       revenue:
 *                         type: number
 *                         description: Revenue from this client
 *                       placements:
 *                         type: integer
 *                         description: Number of placements for this client
 *                 revenue_by_recruiter:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recruiter_id:
 *                         type: string
 *                         format: uuid
 *                         description: Recruiter ID
 *                       recruiter_name:
 *                         type: string
 *                         description: Recruiter name
 *                       revenue:
 *                         type: number
 *                         description: Revenue generated by this recruiter
 *                       placements:
 *                         type: integer
 *                         description: Number of placements by this recruiter
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/revenue", requirePermission("analytics", "view"), getRevenue);

/**
 * @swagger
 * /api/analytics/team-closures:
 *   get:
 *     summary: Get team closures analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter closures from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter closures to this date (YYYY-MM-DD format)
 *       - in: query
 *         name: teamLeadId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific team lead ID (admin only)
 *     responses:
 *       200:
 *         description: Team closures data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 daily_closures:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       closures_count:
 *                         type: integer
 *                       unique_recruiters:
 *                         type: integer
 *                       unique_jobs:
 *                         type: integer
 *                       unique_candidates:
 *                         type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_closures:
 *                       type: integer
 *                     total_recruiters:
 *                       type: integer
 *                     total_jobs:
 *                       type: integer
 *                     total_candidates:
 *                       type: integer
 *                     first_closure_date:
 *                       type: string
 *                       format: date
 *                     last_closure_date:
 *                       type: string
 *                       format: date
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/team-closures", 
  requirePermission("team", "view_kpis"),
  getTeamClosures
);

/**
 * @swagger
 * /api/analytics/submission-success-rate:
 *   get:
 *     summary: Get submission success rate analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter submissions from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter submissions to this date (YYYY-MM-DD format)
 *       - in: query
 *         name: teamLeadId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific team lead ID (admin only)
 *     responses:
 *       200:
 *         description: Submission success rate data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 daily_success_rates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       total_submissions:
 *                         type: integer
 *                       successful_submissions:
 *                         type: integer
 *                       rejected_submissions:
 *                         type: integer
 *                       success_rate:
 *                         type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_submissions:
 *                       type: integer
 *                     total_successful:
 *                       type: integer
 *                     total_rejected:
 *                       type: integer
 *                     total_placed:
 *                       type: integer
 *                     overall_success_rate:
 *                       type: number
 *                 recruiter_breakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recruiter_id:
 *                         type: string
 *                         format: uuid
 *                       recruiter_email:
 *                         type: string
 *                       recruiter_name:
 *                         type: string
 *                       total_submissions:
 *                         type: integer
 *                       successful_submissions:
 *                         type: integer
 *                       rejected_submissions:
 *                         type: integer
 *                       success_rate:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/submission-success-rate", 
  requirePermission("team", "view_kpis"),
  getSubmissionSuccessRate
);

/**
 * @swagger
 * /api/analytics/new-clients-acquired:
 *   get:
 *     summary: Get new clients acquired over time
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves count of clients moved to 'won' stage grouped by month.
 *       For non-admin users, only returns data for their own clients.
 *       Admin users can filter by a specific BDM using the bdmId query parameter.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to this date (YYYY-MM-DD format)
 *       - in: query
 *         name: bdmId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin only: Filter by specific BDM user ID
 *     responses:
 *       200:
 *         description: New clients data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                     description: Month in YYYY-MM format
 *                   count:
 *                     type: integer
 *                     description: Number of clients won in that month
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/new-clients-acquired", 
  requirePermission("reports", "view_own"),
  getNewClientsAcquired
);

/**
 * @swagger
 * /api/analytics/revenue-generated:
 *   get:
 *     summary: Get revenue generated over time
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves revenue from placements grouped by month.
 *       Uses the same join pattern as the BDM summary: placements -> job_descriptions -> clients.
 *       For non-admin users, only returns revenue for their own clients.
 *       Admin users can filter by a specific BDM using the bdmId query parameter.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to this date (YYYY-MM-DD format)
 *       - in: query
 *         name: bdmId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin only: Filter by specific BDM user ID
 *     responses:
 *       200:
 *         description: Revenue data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                     description: Month in YYYY-MM format
 *                   total_revenue:
 *                     type: number
 *                     description: Total revenue in that month
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/revenue-generated", 
  requirePermission("reports", "view_own"),
  getRevenueGenerated
);

/**
 * @swagger
 * /api/analytics/open-opportunities:
 *   get:
 *     summary: Get pipeline funnel by stage
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves count of clients per pipeline stage (funnel view).
 *       For non-admin users, only returns data for their own clients.
 *       Admin users can filter by a specific BDM using the bdmId query parameter.
 *       Date range filters apply to when the stage was last updated.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to this date (YYYY-MM-DD format)
 *       - in: query
 *         name: bdmId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin only: Filter by specific BDM user ID
 *     responses:
 *       200:
 *         description: Pipeline funnel data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   pipeline_stage:
 *                     type: string
 *                     description: Pipeline stage name
 *                   count:
 *                     type: integer
 *                     description: Number of clients in this stage
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/open-opportunities", 
  requirePermission("reports", "view_own"),
  getOpenOpportunities
);

/**
 * @swagger
 * /api/analytics/client-manager-summary:
 *   get:
 *     summary: Get summary analytics for client manager's clients
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client manager summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: integer
 *                   description: Total number of clients managed
 *                 jobs:
 *                   type: object
 *                   properties:
 *                     total_jobs:
 *                       type: integer
 *                     active_jobs:
 *                       type: integer
 *                     closed_jobs:
 *                       type: integer
 *                 submissions:
 *                   type: object
 *                   properties:
 *                     total_submissions:
 *                       type: integer
 *                     submitted:
 *                       type: integer
 *                     under_review:
 *                       type: integer
 *                     shortlisted:
 *                       type: integer
 *                     interview_scheduled:
 *                       type: integer
 *                     offer_extended:
 *                       type: integer
 *                     offer_accepted:
 *                       type: integer
 *                     rejected:
 *                       type: integer
 *                 interviews:
 *                   type: object
 *                   properties:
 *                     total_interviews:
 *                       type: integer
 *                     scheduled:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                 placements:
 *                   type: object
 *                   properties:
 *                     total_placements:
 *                       type: integer
 *                     total_revenue:
 *                       type: number
 *                     avg_revenue:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not a client manager
 *       500:
 *         description: Internal server error
 */
router.get("/client-manager-summary", requirePermission("analytics", "view"), getClientManagerSummary);

export default router;
