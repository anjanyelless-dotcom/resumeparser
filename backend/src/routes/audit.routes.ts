import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// All audit routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get audit logs with pagination and filters
 *     tags: [Audit]
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
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs created after this date (ISO 8601 format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs created before this date (ISO 8601 format)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter logs by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter logs by action (case-insensitive partial match)
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *         description: Filter logs by resource type (case-insensitive partial match)
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 audit_logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Audit log ID
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                         description: ID of the user who performed the action
 *                       action:
 *                         type: string
 *                         description: Action performed (e.g., CREATE_CANDIDATE, UPDATE_JOB)
 *                       resource_type:
 *                         type: string
 *                         description: Type of resource affected (e.g., candidate, job, client)
 *                       resource_id:
 *                         type: string
 *                         description: ID of the affected resource
 *                       ip_address:
 *                         type: string
 *                         description: IP address of the request
 *                       details:
 *                         type: object
 *                         description: Additional details about the action
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: When the action was performed
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                       description: Current page number
 *                     total_pages:
 *                       type: integer
 *                       description: Total number of pages
 *                     total_items:
 *                       type: integer
 *                       description: Total number of audit logs
 *                     items_per_page:
 *                       type: integer
 *                       description: Number of items per page
 *                     has_next_page:
 *                       type: boolean
 *                       description: Whether there's a next page
 *                     has_prev_page:
 *                       type: boolean
 *                       description: Whether there's a previous page
 *                 filters:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       description: Filter start date
 *                     to:
 *                       type: string
 *                       description: Filter end date
 *                     userId:
 *                       type: string
 *                       description: User ID filter
 *                     action:
 *                       type: string
 *                       description: Action filter
 *                     resourceType:
 *                       type: string
 *                       description: Resource type filter
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions - requirePermission("audit_logs", "view")
 *       400:
 *         description: Bad Request - Invalid pagination parameters
 *       500:
 *         description: Internal server error
 */
router.get("/", requirePermission("audit_logs", "view"), getAuditLogs);

export default router;