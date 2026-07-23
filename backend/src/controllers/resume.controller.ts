import { Request, Response } from "express";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

/**
 * Helper function to get file info from multer request
 */
const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
  };
};

/**
 * Helper function to delete uploaded file
 */
const deleteUploadedFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete file: ${filePath}`, error);
  }
};

/**
 * Preview resume sections without running DeBERTa entity extraction
 * Forwards file to Python AI service's /preview-sections endpoint
 */
export const previewSections = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Validate file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: "No file uploaded",
        message: "Please upload a resume file",
      });
      return;
    }

    const fileInfo = getFileInfo(req.file);
    const forceOcr = req.body.force_ocr === 'true' || req.body.force_ocr === true || req.body.forceOcr === 'true' || req.body.forceOcr === true;
    
    console.log(`📄 /api/resume/preview-sections called (forceOcr: ${forceOcr})`);
    console.log(`📎 Filename received: ${fileInfo.originalname}`);

    // 2. Create FormData to forward to Python service
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path), {
      filename: fileInfo.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("force_ocr", forceOcr ? "true" : "false");

    // 3. Forward to Python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const endpoint = `${aiServiceUrl}/preview-sections`;

    console.log(`🔄 Forwarding to Python AI service: ${endpoint}`);

    const response = await axios.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 second timeout
    });

    console.log(`✅ Python service call succeeded for: ${fileInfo.originalname}`);

    // 4. Clean up uploaded file
    try {
      deleteUploadedFile(req.file.path);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to delete temporary file: ${req.file.path}`);
    }

    // 5. Return response from Python service directly without modification
    res.status(200).json(response.data);

  } catch (error: any) {
    console.error(`❌ Python service call failed: ${error.message}`);

    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        deleteUploadedFile(req.file.path);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to delete temporary file: ${req.file.path}`);
      }
    }

    // Handle specific error cases
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      console.error(`❌ AI service unreachable: ${error.code}`);
      res.status(500).json({
        error: "AI service unreachable",
        message: "The Python AI service is currently unreachable. Please ensure it is running.",
      });
      return;
    }

    if (error.response) {
      // Python service returned an error
      console.error(`❌ Python service error: ${error.response.status} - ${error.response.data?.detail || error.response.data?.message}`);
      res.status(500).json({
        error: "Preview sections failed",
        message: error.response.data?.detail || error.response.data?.message || "Failed to preview sections",
      });
      return;
    }

    // Generic error
    console.error(`❌ Unexpected error: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      message: "An unexpected error occurred while previewing sections",
    });
  }
};
