import { Router } from "express";
import {
  getParsingStats,
  getSkillDistribution,
  getMetrics,
  getUploadTrends,
  getRecruiterActivity,
  getAccuracyOverview,
  exportCSV,
  exportPDF
} from "../controllers/analytics.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Protect all analytics endpoints with token authentication
router.use(authenticateToken);

// Analytics endpoints
router.get("/parsing-stats", getParsingStats);
router.get("/skill-distribution", getSkillDistribution);
router.get("/metrics", getMetrics);
router.get("/upload-trends", getUploadTrends);
router.get("/recruiter-activity", getRecruiterActivity);
router.get("/export/csv", exportCSV);
router.get("/export/pdf", exportPDF);

// Accuracy overview endpoint
router.get("/overview", getAccuracyOverview);

export default router;
