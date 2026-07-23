import { Request, Response } from "express";
import { query } from "../database/db";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    roleName: string;
    roleId: string;
  };
}

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const from = (req.query.from as string) || undefined;
    const to = (req.query.to as string) || undefined;
    const userId = (req.query.userId as string) || undefined;
    const action = (req.query.action as string) || undefined;
    const resourceType = (req.query.resourceType as string) || undefined;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 500) {
      res.status(400).json({
        error:
          "Invalid pagination parameters. Page must be ≥1, limit must be between 1-500",
      });
      return;
    }

    // Build WHERE conditions
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (from && to) {
      whereConditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(from, to);
      paramIndex += 2;
    } else if (from) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(from);
      paramIndex += 1;
    } else if (to) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(to);
      paramIndex += 1;
    }

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex += 1;
    }

    if (action) {
      whereConditions.push(`action ILIKE $${paramIndex}`);
      queryParams.push(`%${action}%`);
      paramIndex += 1;
    }

    if (resourceType) {
      whereConditions.push(`resource_type ILIKE $${paramIndex}`);
      queryParams.push(`%${resourceType}%`);
      paramIndex += 1;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM audit_logs 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT 
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        ip_address,
        details,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const result = await query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      audit_logs: result.rows,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: total,
        items_per_page: limit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
      filters: {
        from,
        to,
        userId,
        action,
        resourceType,
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve audit logs" });
  }
};