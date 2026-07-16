import { Router } from "express";
import {
  getUserPermissions,
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getAllRoles,
} from "../controllers/permissions.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Protect all permission routes with authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/permissions/me:
 *   get:
 *     summary: Get current user's permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/me", getUserPermissions);

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get full permission catalog
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission catalog retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", getAllPermissions);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all available roles
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/roles", getAllRoles);

// Admin-only routes for role management
router.use(requireRole(["admin"]));

/**
 * @swagger
 * /api/role-permissions/{roleId}:
 *   get:
 *     summary: Get permissions for a specific role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */
router.get("/role-permissions/:roleId", getRolePermissions);

/**
 * @swagger
 * /api/role-permissions/{roleId}:
 *   put:
 *     summary: Update permissions for a specific role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of permission IDs to assign to the role
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */
router.put("/role-permissions/:roleId", updateRolePermissions);

export default router;