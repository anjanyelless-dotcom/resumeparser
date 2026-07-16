import { Router } from "express";
import { previewSections } from "../controllers/resume.controller";
import {
  uploadResume as multerMiddleware,
  handleUploadError,
} from "../middleware/upload.middleware";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// All resume routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/resume/preview-sections:
 *   post:
 *     summary: Preview resume sections without DeBERTa entity extraction
 *     tags: [Resume]
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
 *       400:
 *         description: Bad request - no file uploaded
 *       500:
 *         description: Internal server error or AI service unavailable
 */
router.post(
  "/preview-sections",
  multerMiddleware,
  handleUploadError,
  previewSections
);

export default router;
