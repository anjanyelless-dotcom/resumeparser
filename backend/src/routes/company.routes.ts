import { Router } from "express";
import {
  scanCompany,
  getCompanyById,
  getCompanyScanStatus,
  getCompanies,
  rescanCompany,
  validateScanCompany,
  validateCompanyId,
  validateCompanyFilters,
} from "../controllers/company.controller";
import { scanRateLimit, generalRateLimit } from "../middleware/rateLimit.middleware";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// All company routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/companies/scan:
 *   post:
 *     summary: Scan a company website and enqueue scrape job
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               website:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com"
 *     responses:
 *       201:
 *         description: Company scan queued successfully
 *       400:
 *         description: Validation failed
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post("/scan", scanRateLimit, validateScanCompany, scanCompany);

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get paginated list of companies with filters
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by company name or website
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum hiring score
 *       - in: query
 *         name: hiringStatus
 *         schema:
 *           type: string
 *           enum: [not_hiring, hiring, actively_hiring, occasionally_hiring]
 *         description: Filter by hiring status
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
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Server error
 */
router.get("/", generalRateLimit, validateCompanyFilters, getCompanies);

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get full company record with contacts, jobs, and scrape status
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company retrieved successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.get("/:id", generalRateLimit, validateCompanyId, getCompanyById);

/**
 * @swagger
 * /api/companies/{id}/scan-status:
 *   get:
 *     summary: Get current scrape status for a company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Scan status retrieved successfully
 *       404:
 *         description: No scrape job found
 *       500:
 *         description: Server error
 */
router.get("/:id/scan-status", generalRateLimit, validateCompanyId, getCompanyScanStatus);

/**
 * @swagger
 * /api/companies/{id}/rescan:
 *   post:
 *     summary: Manually re-trigger a scrape for a company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Rescan queued successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.post("/:id/rescan", generalRateLimit, validateCompanyId, rescanCompany);

export default router;
