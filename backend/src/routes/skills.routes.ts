import { Router } from 'express';
import { searchSkills, getAllSkills } from '../controllers/skills.controller';

const router = Router();

/**
 * @swagger
 * /api/skills/search:
 *   get:
 *     summary: Search for skills
 *     tags: [Skills]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query (minimum 2 characters)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 */
router.get('/search', searchSkills);

/**
 * @swagger
 * /api/skills/all:
 *   get:
 *     summary: Get all skills
 *     tags: [Skills]
 *     responses:
 *       200:
 *         description: All skills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 */
router.get('/all', getAllSkills);

export default router;
