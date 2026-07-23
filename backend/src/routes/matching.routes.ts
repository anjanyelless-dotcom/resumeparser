import { Router } from "express";
import {
  matchCandidatesToJob,
  getMatchResultsForJob,
  getAllMatchResults,
  matchSingleCandidate,
  parseJDAndMatch,
  updateRecruiterDecision,
  submitToHiringProcess,
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
router.post("/jd/parse", requirePermission("ai_matching", "view"), parseJDAndMatch);

// POST /api/matching/job/:jobId/candidates
// Match all candidates to a specific job
router.post("/job/:jobId/candidates", requirePermission("ai_matching", "view"), matchCandidatesToJob);

// GET /api/matching/job/:jobId/results
// Get cached match results for a specific job
router.get("/job/:jobId/results", requirePermission("ai_matching", "view"), getMatchResultsForJob);

// GET /api/matching/results
// Get all match results
router.get("/results", requirePermission("ai_matching", "view"), getAllMatchResults);

// POST /api/matching/candidate/:candidateId/job/:jobId
// Match a single candidate to a specific job
router.post("/candidate/:candidateId/job/:jobId", requirePermission("ai_matching", "view"), matchSingleCandidate);

// PATCH /api/matching/job/:jobId/decision
// Update recruiter decision (Shortlist/Reject/Pending) for candidates
router.patch("/job/:jobId/decision", requirePermission("ai_matching", "edit"), updateRecruiterDecision);

// POST /api/matching/job/:jobId/submit-to-hiring
// Submit shortlisted candidates into the formal hiring process (submissions)
router.post("/job/:jobId/submit-to-hiring", requirePermission("ai_matching", "edit"), submitToHiringProcess);

export default router;
