import { Request, Response } from "express";
import { getClient } from "../database/db";
import { authenticateToken } from "../middleware/auth.middleware";

interface ActivitySummary {
  userId: string;
  fromDate: string;
  toDate: string;
  activityCounts: {
    [activityType: string]: number;
  };
}

// Get activity summary for a user
export const getActivitySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestingUserId = (req as any).user?.id;
    const requestingTenantId = (req as any).user?.tenant_id || "default";
    const targetUserId = req.query.userId as string;
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;

    if (!requestingUserId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
        code: "USER_ID_REQUIRED"
      });
      return;
    }

    // If no userId specified, default to requesting user (recruiter's own stats)
    const userId = targetUserId || requestingUserId;

    // Check if user is requesting their own stats or has permission to view others
    if (userId !== requestingUserId) {
      // TODO: Add permission check for team leads to view other recruiters' stats
      // For now, only allow users to view their own stats
      res.status(403).json({
        error: "Forbidden",
        message: "You can only view your own activity summary",
        code: "PERMISSION_DENIED"
      });
      return;
    }

    const client = await getClient();
    try {
      let query = `
        SELECT action, COUNT(*) as count
        FROM activity_log
        WHERE user_id = $1
      `;
      const params: any[] = [userId];
      let paramCount = 1;

      // Add date filters if provided
      if (fromDate) {
        paramCount++;
        query += ` AND created_at >= $${paramCount}`;
        params.push(fromDate);
      }

      if (toDate) {
        paramCount++;
        query += ` AND created_at <= $${paramCount}`;
        params.push(toDate);
      }

      query += `
        GROUP BY action
        ORDER BY action
      `;

      const result = await client.query(query, params);
      
      // Convert to object with action as key
      const activityCounts: { [key: string]: number } = {};
      result.rows.forEach(row => {
        activityCounts[row.action] = parseInt(row.count);
      });

      const summary: ActivitySummary = {
        userId,
        fromDate: fromDate || 'all time',
        toDate: toDate || 'all time',
        activityCounts
      };

      res.json(summary);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get activity summary error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch activity summary",
      code: "GET_ACTIVITY_SUMMARY_FAILED"
    });
  }
};