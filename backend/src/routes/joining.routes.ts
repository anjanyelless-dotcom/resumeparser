import { Router } from "express";
import { getJoiningCandidates, updateJoiningStatus } from "../controllers/joining.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

// Get candidates in the joining stage
router.get("/", requirePermission("joinings", "view"), getJoiningCandidates);

// Update joining status
router.patch("/:id/status", requirePermission("joinings", "update"), updateJoiningStatus);

export default router;
