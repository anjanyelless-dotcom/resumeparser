import { Router } from "express";
import {
  createCommunication,
  getCommunications,
  getFollowUpsDue,
} from "../controllers/communication.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/communications:
 *   post:
 *     summary: Log a communication with a client
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Logs a communication with a client.
 *       Accessible to users with communications:log permission.
 *       The client must belong to the user (ownership check: client.owner_user_id === req.user.id).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_id
 *               - communication_type
 *               - subject
 *               - notes
 *             properties:
 *               client_id:
 *                 type: string
 *                 format: uuid
 *                 description: Client ID
 *               contact_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional contact ID (must belong to the client)
 *               communication_type:
 *                 type: string
 *                 enum: [call, email, meeting, note, other]
 *                 description: Type of communication
 *               subject:
 *                 type: string
 *                 description: Subject of the communication
 *               notes:
 *                 type: string
 *                 description: Detailed notes about the communication
 *               follow_up_date:
 *                 type: string
 *                 format: date-time
 *                 description: Optional follow-up date for this communication
 *     responses:
 *       201:
 *         description: Communication logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 communication:
 *                   type: object
 *       400:
 *         description: Bad Request - Missing required fields or invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Client does not belong to user
 *       404:
 *         description: Client or contact not found
 *       500:
 *         description: Internal server error
 */
router.post("/", requirePermission("communications", "log"), createCommunication);

/**
 * @swagger
 * /api/communications:
 *   get:
 *     summary: Get communications with optional filters
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves communications for the user's clients with optional filtering.
 *       Only returns communications for clients owned by the user.
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by client ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by created date (from)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by created date (to)
 *     responses:
 *       200:
 *         description: Communications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 communications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       client_id:
 *                         type: string
 *                       contact_id:
 *                         type: string
 *                       communication_type:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       follow_up_date:
 *                         type: string
 *                       logged_by:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *                       company_name:
 *                         type: string
 *                       contact_first_name:
 *                         type: string
 *                       contact_last_name:
 *                         type: string
 *                       contact_email:
 *                         type: string
 *                       logged_by_name:
 *                         type: string
 *                       logged_by_last_name:
 *                         type: string
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", requirePermission("communications", "view"), getCommunications);

/**
 * @swagger
 * /api/communications/follow-ups-due:
 *   get:
 *     summary: Get follow-ups due for the current user
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves communications with follow-up dates that are due (follow_up_date <= NOW()).
 *       Only returns follow-ups for communications logged by the current user.
 *       This powers a "don't forget to call them back" view.
 *     responses:
 *       200:
 *         description: Follow-ups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followUps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       client_id:
 *                         type: string
 *                       contact_id:
 *                         type: string
 *                       communication_type:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       follow_up_date:
 *                         type: string
 *                       logged_by:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *                       company_name:
 *                         type: string
 *                       contact_first_name:
 *                         type: string
 *                       contact_last_name:
 *                         type: string
 *                       contact_email:
 *                         type: string
 *                       contact_phone:
 *                         type: string
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/follow-ups-due", requirePermission("dashboard", "view"), getFollowUpsDue);

export default router;