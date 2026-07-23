import { Router } from "express";
import {
  getActivitySummary,
} from "../controllers/activity.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/activity/summary:
 *   get:
 *     summary: Get activity summary for a user
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID to get summary for (defaults to requesting user)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for activity filter (ISO format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for activity filter (ISO format)
 *     responses:
 *       200:
 *         description: Activity summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: User ID for the summary
 *                 fromDate:
 *                   type: string
 *                   description: Start date for the summary (or 'all time')
 *                 toDate:
 *                   type: string
 *                   description: End date for the summary (or 'all time')
 *                 activityCounts:
 *                   type: object
 *                   description: Activity counts grouped by type
 *                   additionalProperties:
 *                     type: integer
 *                   example:
 *                     candidate_created: 15
 *                     submission_created: 10
 *                     interview_scheduled: 5
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user can only view their own stats
 *       500:
 *         description: Internal server error
 */
router.get("/summary", getActivitySummary);

export default router;