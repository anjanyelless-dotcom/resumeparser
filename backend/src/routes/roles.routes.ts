import { Router } from 'express';
import { searchRoles, getAllRoles } from '../controllers/roles.controller';

const router = Router();

/**
 * @swagger
 * /api/roles/search:
 *   get:
 *     summary: Search roles with fuzzy matching
 *     tags: [Roles]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query (minimum 2 characters)
 *     responses:
 *       200:
 *         description: List of matching roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       canonicalTitle:
 *                         type: string
 *                       seniority:
 *                         type: string
 *                       domain:
 *                         type: string
 */
router.get('/search', searchRoles);

/**
 * @swagger
 * /api/roles/all:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of all roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       canonicalTitle:
 *                         type: string
 *                       seniority:
 *                         type: string
 *                       domain:
 *                         type: string
 */
router.get('/all', getAllRoles);

export default router;
