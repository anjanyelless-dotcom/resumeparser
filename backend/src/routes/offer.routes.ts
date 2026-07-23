import { Router } from "express";
import { getOffers, updateOfferStatus } from "../controllers/offer.controller";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

// Get candidates in the offer stage
router.get("/", requirePermission("offers", "view"), getOffers);

// Update offer status
router.patch("/:id/status", requirePermission("offers", "update"), updateOfferStatus);

export default router;
