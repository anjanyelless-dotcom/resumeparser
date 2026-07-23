import { Router } from "express";
import {
  getUnifiedSummary,
  getAdminSummary,
  getRecruiterSummary,
  getTeamLeadSummary,
  getClientManagerSummary,
  getBDMSummary
} from "../controllers/dashboard.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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
router.get("/summary", getUnifiedSummary);

// Legacy routes (mapped to getUnifiedSummary internally)
router.get("/admin-summary", getAdminSummary);
router.get("/recruiter-summary", requirePermission("dashboard", "view"), getRecruiterSummary);
router.get("/team-lead-summary", requirePermission("dashboard", "view"), getTeamLeadSummary);
router.get("/client-manager-summary", requirePermission("dashboard", "view"), getClientManagerSummary);
router.get("/bdm-summary", requirePermission("dashboard", "view"), getBDMSummary);

export default router;