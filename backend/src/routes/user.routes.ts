import { Router } from "express";
import {
  getAllUsers,
  getMyTeam,
  updateUserRole,
  activateUser,
  deactivateUser,
  createUser,
} from "../controllers/user.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of users to skip
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can view all users
 *       500:
 *         description: Internal server error
 */
router.get("/", requirePermission("users", "view"), getAllUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [admin, recruiter, team_lead, client_manager, bdm, viewer]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request - invalid input
 *       403:
 *         description: Forbidden - Only admins can create users
 *       409:
 *         description: Conflict - email already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", requirePermission("users", "edit"), createUser);

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     summary: Update user role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can update roles
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id/role", requirePermission("users", "edit"), updateUserRole);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   put:
 *     summary: Activate a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User activated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can activate users
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id/activate", requirePermission("users", "edit"), activateUser);

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   put:
 *     summary: Deactivate a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can deactivate users
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id/deactivate", requirePermission("users", "edit"), deactivateUser);

/**
 * @swagger
 * /api/users/my-team:
 *   get:
 *     summary: Get team members for a team lead
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 team_members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       active_assignment_count:
 *                         type: integer
 *                         description: Number of active job assignments
 *                       team_lead_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                 count:
 *                   type: integer
 *                   description: Total number of team members
 *                 user_role:
 *                   type: string
 *                   description: Role of the requesting user
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a team lead or admin
 *       500:
 *         description: Internal server error
 */
router.get("/my-team", getMyTeam);

export default router;