import { Router } from "express";
import {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
  updateCandidateWithFullData,
  deleteCandidate,
  getCandidateParsingStatus,
  importCandidatesFromCSV,
  getDuplicates,
  mergeCandidates,
  ignoreDuplicate,
  importExternalCandidate,
  saveApplicationProgress,
  loadApplicationProgress,
} from "../controllers/candidate.controller";
import { searchCandidatesByFilters, getFilterOptions, generateXRaySearch, booleanSearchCandidates } from "../controllers/candidate-search.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import multer from "multer";

const router = Router();
const uploadCSV = multer({
  dest: process.env.FILE_UPLOAD_PATH || "./uploads",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// All candidate routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/candidates:
 *   post:
 *     summary: Create a new candidate
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               location:
 *                 type: string
 *               linkedin_url:
 *                 type: string
 *                 format: uri
 *               github_url:
 *                 type: string
 *                 format: uri
 *               summary:
 *                 type: string
 *               raw_resume_text:
 *                 type: string
 *               file_path:
 *                 type: string
 *               file_type:
 *                 type: string
 *                 enum: [pdf, docx, txt, image]
 *     responses:
 *       201:
 *         description: Candidate created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/", createCandidate);

// POST /api/candidates/import-csv
// Import candidates in bulk using CSV file
router.post("/import-csv", uploadCSV.single("file"), importCandidatesFromCSV);

// POST /api/candidates/import-external
// Import external candidate from LinkedIn, GitHub, etc.
router.post("/import-external", importExternalCandidate);

// Duplicate resume management routes
router.get("/duplicates", getDuplicates);
router.post("/merge", mergeCandidates);
router.post("/ignore-duplicate", ignoreDuplicate);

/**
 * @swagger
 * /api/candidates:
 *   get:
 *     summary: Get all candidates with pagination and search
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in full_name, email, or location
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Search by company name in work history
 *       - in: query
 *         name: job_title
 *         schema:
 *           type: string
 *         description: Search by job title in work history
 *       - in: query
 *         name: certification
 *         schema:
 *           type: string
 *         description: Search by certification name
 *       - in: query
 *         name: salary_min
 *         schema:
 *           type: number
 *         description: Minimum expected salary
 *       - in: query
 *         name: salary_max
 *         schema:
 *           type: number
 *         description: Maximum expected salary
 *     responses:
 *       200:
 *         description: Candidates retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", getAllCandidates);

/**
 * @swagger
 * /api/candidates/filter-options:
 *   get:
 *     summary: Get available filter options from database
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Filter options retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/filter-options", getFilterOptions);

/**
 * @swagger
 * /api/candidates/search/filters:
 *   post:
 *     summary: Search candidates by structured filters
 *     tags: [Candidates]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               minExperience:
 *                 type: number
 *               maxExperience:
 *                 type: number
 *               locations:
 *                 type: array
 *                 items:
 *                   type: string
 *               education:
 *                 type: array
 *                 items:
 *                   type: string
 *               noticePeriod:
 *                 type: array
 *                 items:
 *                   type: string
 *               currentCompany:
 *                 type: array
 *                 items:
 *                   type: string
 *               employmentType:
 *                 type: array
 *                 items:
 *                   type: string
 *               page:
 *                 type: integer
 *               limit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Candidates searched successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/search/filters", searchCandidatesByFilters);

/**
 * @swagger
 * /api/candidates/xray-search:
 *   post:
 *     summary: Generate X-Ray search queries for multiple platforms
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               locations:
 *                 type: array
 *                 items:
 *                   type: string
 *               minExperience:
 *                 type: number
 *               maxExperience:
 *                 type: number
 *               currentCompany:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: X-Ray search queries generated successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/xray-search", generateXRaySearch);

/**
 * @swagger
 * /api/candidates/boolean-search:
 *   post:
 *     summary: Search candidates using Boolean query syntax
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Boolean search query (e.g., "React AND (Redux OR TypeScript)")
 *               page:
 *                 type: integer
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 default: 20
 *     responses:
 *       200:
 *         description: Candidates searched successfully
 *       400:
 *         description: Invalid query syntax
 *       401:
 *         description: Unauthorized
 */
router.post("/boolean-search", booleanSearchCandidates);

/**
 * @swagger
 * /api/candidates/{id}:
 *   get:
 *     summary: Get a specific candidate with all details
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Candidate retrieved successfully
 *       404:
 *         description: Candidate not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", getCandidateById);

/**
 * @swagger
 * /api/candidates/{id}:
 *   put:
 *     summary: Update a candidate
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               location:
 *                 type: string
 *               linkedin_url:
 *                 type: string
 *                 format: uri
 *               github_url:
 *                 type: string
 *                 format: uri
 *               summary:
 *                 type: string
 *     responses:
 *       200:
 *         description: Candidate updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Candidate not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:id", updateCandidate);

/**
 * @swagger
 * /api/candidates/{id}/update-full:
 *   put:
 *     summary: Update a candidate with full resume data (skills, work history, education, etc.)
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               summary:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               work_history:
 *                 type: array
 *                 items:
 *                   type: object
 *               education:
 *                 type: array
 *                 items:
 *                   type: object
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: string
 *               projects:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Candidate updated successfully with all related data
 *       400:
 *         description: Bad request
 *       404:
 *         description: Candidate not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:id/update-full", updateCandidateWithFullData);

/**
 * @swagger
 * /api/candidates/{id}:
 *   delete:
 *     summary: Soft delete a candidate
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Candidate deleted successfully
 *       404:
 *         description: Candidate not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", deleteCandidate);

/**
 * @swagger
 * /api/candidates/{id}/parsing-status:
 *   get:
 *     summary: Get parsing status for a candidate
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Parsing status retrieved successfully
 *       404:
 *         description: No parsing job found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id/parsing-status", getCandidateParsingStatus);

/**
 * @swagger
 * /api/candidates/{id}/application-progress:
 *   post:
 *     summary: Save application progress for a candidate
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               application_data:
 *                 type: object
 *                 description: Application progress data
 *               last_updated:
 *                 type: string
 *                 format: date-time
 *                 description: Last update timestamp
 *     responses:
 *       200:
 *         description: Application progress saved successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Candidate not found
 *       401:
 *         description: Unauthorized
 */
router.post("/:id/application-progress", saveApplicationProgress);

/**
 * @swagger
 * /api/candidates/{id}/application-progress:
 *   get:
 *     summary: Load application progress for a candidate
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *     responses:
 *       200:
 *         description: Application progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 application_data:
 *                   type: object
 *                 last_updated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No application progress found or candidate not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id/application-progress", loadApplicationProgress);


export default router;
