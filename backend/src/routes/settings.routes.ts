import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Protect settings with authentication
router.use(authenticateToken);

router.get("/", getSettings);
router.put("/", updateSettings);

export default router;
