import { Router } from "express";
import { getPlacementCandidates, createPlacement, getPlacementRecords } from "../controllers/placement.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

// Get candidates in the placement stage
router.get("/", requirePermission("placement", "view"), getPlacementCandidates);

// Create a placement record
router.post("/:id", requirePermission("placement", "create"), createPlacement);

// Get placement records
router.get("/records", requirePermission("placement", "view"), getPlacementRecords);

export default router;
