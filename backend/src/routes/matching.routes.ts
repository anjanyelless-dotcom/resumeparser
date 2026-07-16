import { Router } from "express";
import {
  matchCandidatesToJob,
  getMatchResultsForJob,
  getAllMatchResults,
  matchSingleCandidate,
  parseJDAndMatch,
} from "../controllers/matching.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication to all matching routes
router.use(authenticateToken);

/**
 * Matching Routes
 * Endpoints for candidate-job matching operations
 */

// POST /api/matching/jd/parse
// Parse a raw JD and rank all candidates by ATS score (local engine, no external AI)
router.post("/jd/parse", requirePermission("matching", "view"), parseJDAndMatch);

// POST /api/matching/job/:jobId/candidates
// Match all candidates to a specific job
router.post("/job/:jobId/candidates", requirePermission("matching", "view"), matchCandidatesToJob);

// GET /api/matching/job/:jobId/results
// Get cached match results for a specific job
router.get("/job/:jobId/results", requirePermission("matching", "view"), getMatchResultsForJob);

// GET /api/matching/results
// Get all match results
router.get("/results", requirePermission("matching", "view"), getAllMatchResults);

// POST /api/matching/candidate/:candidateId/job/:jobId
// Match a single candidate to a specific job
router.post("/candidate/:candidateId/job/:jobId", requirePermission("matching", "view"), matchSingleCandidate);

export default router;

