import { Router } from "express";
import { bulkUploadResumes } from "../controllers/bulk-upload.controller";
import {
  uploadBulkResumes as multerMiddleware,
  handleUploadError,
  addFileInfo,
} from "../middleware/upload.middleware";

const router = Router();

/**
 * POST /api/upload/bulk
 * Upload and parse multiple resumes in parallel with controlled concurrency.
 * Request: multipart/form-data
 *   - resumes: multiple files (PDF, DOCX, TXT)
 *   - model: "own-model" (default) or "gpt-4o-mini"
 *   - force_ocr: "true" | "false"
 */
router.post(
  "/bulk",
  multerMiddleware,
  handleUploadError,
  addFileInfo,
  bulkUploadResumes
);

export default router;
