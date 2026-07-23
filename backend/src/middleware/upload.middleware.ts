import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

// Ensure upload directory exists
const uploadPath = process.env.FILE_UPLOAD_PATH || "./uploads";
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`📁 Created upload directory: ${uploadPath}`);
}

// File filter for allowed types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "application/pdf", // PDF files
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX files
    "text/plain", // TXT files
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file type: ${file.mimetype}. Only PDF, DOCX, and TXT files are allowed.`,
    );
    cb(error as any);
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    cb(null, uploadPath);
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    // Generate unique filename: {uuid}_{originalname}
    const uniqueId = uuidv4();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitize filename
    const filename = `${uniqueId}_${originalName}`;
    cb(null, filename);
  },
});

// Get max file size from environment (default 10MB)
const maxFileSize =
  parseInt(process.env.MAX_FILE_SIZE_MB || "10") * 1024 * 1024;

// Create multer upload middleware
export const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1, // Only allow one file at a time
  },
}).single("resume"); // Field name for the file

// Error handling middleware for multer
export const handleUploadError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        res.status(400).json({
          error: "File too large",
          message: `Maximum file size is ${process.env.MAX_FILE_SIZE_MB || "10"}MB`,
          code: "FILE_TOO_LARGE",
        });
        return;
      case "LIMIT_FILE_COUNT":
        res.status(400).json({
          error: "Too many files",
          message: "Only one file can be uploaded at a time",
          code: "TOO_MANY_FILES",
        });
        return;
      case "LIMIT_UNEXPECTED_FILE":
        res.status(400).json({
          error: "Unexpected field",
          message: 'File must be uploaded with field name "resume"',
          code: "UNEXPECTED_FIELD",
        });
        return;
      default:
        res.status(400).json({
          error: "Upload error",
          message: err.message,
          code: "UPLOAD_ERROR",
        });
        return;
    }
  }

  // Handle file filter errors
  if (err && err.message.includes("Invalid file type")) {
    res.status(400).json({
      error: "Invalid file type",
      message: err.message,
      code: "INVALID_FILE_TYPE",
      allowedTypes: ["PDF", "DOCX", "TXT"],
    });
    return;
  }

  // Handle other errors
  if (err) {
    res.status(400).json({
      error: "Upload failed",
      message: err.message,
      code: "UPLOAD_FAILED",
    });
    return;
  }

  next();
};

// Helper function to get file type from mimetype
export const getFileType = (mimetype: string): string => {
  switch (mimetype) {
    case "application/pdf":
      return "pdf";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "text/plain":
      return "txt";
    default:
      return "unknown";
  }
};

// Helper function to validate uploaded file
export const validateUploadedFile = (file: Express.Multer.File) => {
  if (!file) {
    throw new Error("No file uploaded");
  }

  const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || "10") * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(
      `File size exceeds maximum allowed size of ${process.env.MAX_FILE_SIZE_MB || "10"}MB`,
    );
  }

  const allowedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      `Invalid file type: ${file.mimetype}. Only PDF, DOCX, and TXT files are allowed.`,
    );
  }

  return true;
};

// Helper function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    type: getFileType(file.mimetype),
    uploadDate: new Date().toISOString(),
  };
};

// Helper function to delete uploaded file
export const deleteUploadedFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Failed to delete file ${filePath}:`, error);
    return false;
  }
};

// Middleware to add file info to request
export const addFileInfo = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.file) {
    req.fileInfo = getFileInfo(req.file);
  }
  next();
};

// Export types for use in other files
export interface UploadedFileInfo {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  type: string;
  uploadDate: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      fileInfo?: UploadedFileInfo;
    }
  }
}

export default uploadResume;
