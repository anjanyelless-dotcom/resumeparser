import { Router } from "express";
import {
  uploadResume,
  getUploadConfig,
  getUploadStats,
  previewSections,
  parseSections,
} from "../controllers/upload.controller";
import {
  uploadResume as multerMiddleware,
  handleUploadError,
  addFileInfo,
} from "../middleware/upload.middleware";
import { authenticateToken, requireRole, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// All upload routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/upload/resume:
 *   post:
 *     summary: Upload a resume file for parsing
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: resume
 *         type: file
 *         required: true
 *         description: Resume file (PDF, DOCX, or TXT)
 *     responses:
 *       201:
 *         description: Resume uploaded successfully and processing started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Resume uploaded successfully and processing started"
 *                 data:
 *                   type: object
 *                   properties:
 *                     candidateId:
 *                       type: string
 *                       format: uuid
 *                     jobId:
 *                       type: string
 *                     parsingJobId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [queued]
 *                     fileInfo:
 *                       type: object
 *                       properties:
 *                         originalName:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         type:
 *                           type: string
 *                           enum: [pdf, docx, txt]
 *       400:
 *         description: Bad request - file validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                   enum: [NO_FILE_UPLOADED, INVALID_FILE_TYPE, FILE_TOO_LARGE, UPLOAD_FAILED]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/resume",
  multerMiddleware, // Handle file upload with multer
  handleUploadError, // Handle multer errors
  addFileInfo, // Add file info to request
  uploadResume, // Process the upload
);

/**
 * @swagger
 * /api/upload/preview-sections:
 *   post:
 *     summary: Preview resume sections without DeBERTa entity extraction
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: Resume file (PDF, DOCX, or TXT)
 *     responses:
 *       200:
 *         description: Section preview completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 filename:
 *                   type: string
 *                 extraction_method:
 *                   type: string
 *                 raw_text_length:
 *                   type: integer
 *                 raw_text:
 *                   type: string
 *                 total_sections:
 *                   type: integer
 *                 sections:
 *                   type: object
 *                 detected_sections:
 *                   type: array
 *                   items:
 *                     type: string
 *                 missing_sections:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Bad request - no file uploaded
 *       503:
 *         description: AI service unavailable
 *       500:
 *         description: Internal server error
 */
router.post(
  "/preview-sections",
  multerMiddleware, // Handle file upload with multer
  handleUploadError, // Handle multer errors
  previewSections, // Forward to Python AI service
);

router.post(
  "/parse-sections",
  parseSections,
);

/**
 * @swagger
 * /api/upload/config:
 *   get:
 *     summary: Get upload configuration and requirements
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upload configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 config:
 *                   type: object
 *                   properties:
 *                     maxFileSizeMB:
 *                       type: integer
 *                       example: 10
 *                     maxFileSizeBytes:
 *                       type: integer
 *                       example: 10485760
 *                     allowedTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["PDF", "DOCX", "TXT"]
 *                     allowedMimeTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
 *                     uploadPath:
 *                       type: string
 *                       example: "./uploads"
 *                     fieldName:
 *                       type: string
 *                       example: "resume"
 *                 instructions:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                       example: "POST"
 *                     endpoint:
 *                       type: string
 *                       example: "/api/upload/resume"
 *                     contentType:
 *                       type: string
 *                       example: "multipart/form-data"
 *                     fieldName:
 *                       type: string
 *                       example: "resume"
 *                     authentication:
 *                       type: string
 *                       example: "Bearer token required"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/config", getUploadConfig);

/**
 * @swagger
 * /api/upload/stats:
 *   get:
 *     summary: Get upload statistics (admin only)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upload statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalCandidates:
 *                       type: integer
 *                     candidatesWithFiles:
 *                       type: integer
 *                     candidatesWithoutFiles:
 *                       type: integer
 *                     parsingJobs:
 *                       type: object
 *                       properties:
 *                         queued:
 *                           type: integer
 *                         processing:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                     fileTypes:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/stats",
  requirePermission("upload", "view_stats"), // Require upload view_stats permission
  getUploadStats,
);

export default router;
