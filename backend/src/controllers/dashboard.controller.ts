import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";

/**
 * Unified endpoint for dynamic, permission-driven dashboard metrics
 */
export const getUnifiedSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User context is required",
        code: "UNAUTHORIZED"
      });
      return;
    }

    const summary = await DashboardService.getSummary(user);
    res.json(summary);
  } catch (error) {
    console.error("Get unified summary error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch dashboard summary",
      code: "GET_SUMMARY_FAILED"
    });
  }
};

// =========================================================
// Legacy endpoints below - all mapped to unified service
// =========================================================

export const getRecruiterSummary = async (req: Request, res: Response): Promise<void> => {
  await getUnifiedSummary(req, res);
};

export const getTeamLeadSummary = async (req: Request, res: Response): Promise<void> => {
  await getUnifiedSummary(req, res);
};

export const getClientManagerSummary = async (req: Request, res: Response): Promise<void> => {
  await getUnifiedSummary(req, res);
};

export const getAdminSummary = async (req: Request, res: Response): Promise<void> => {
  await getUnifiedSummary(req, res);
};

export const getBDMSummary = async (req: Request, res: Response): Promise<void> => {
  await getUnifiedSummary(req, res);
};