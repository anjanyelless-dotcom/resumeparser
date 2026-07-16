import { Request, Response } from "express";
import { getClient } from "../database/db";
import { authenticateToken } from "../middleware/auth.middleware";
import bcrypt from "bcryptjs";

interface TeamMember {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  active_assignment_count: number;
  team_lead_id: string | null;
}

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

// Get all users with pagination
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const client = await getClient();
    try {
      let result;
      let total;

      if (userRole === 'admin') {
        // Admins can view all users
        const countResult = await client.query("SELECT COUNT(*) as total FROM users");
        total = parseInt(countResult.rows[0].total);

        result = await client.query(
          `SELECT id, email, role, is_active, tenant_id, created_at
           FROM users
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, skip]
        );
      } else if (userRole === 'client_manager') {
        // Client managers can only see recruiters assigned to their clients' jobs
        const query = `
          SELECT DISTINCT u.id, u.email, u.role, u.is_active, u.tenant_id, u.created_at
          FROM users u
          JOIN job_recruiter_assignments jra ON u.id = jra.recruiter_id
          JOIN job_descriptions j ON jra.job_id = j.id
          JOIN clients c ON j.client_id = c.id
          WHERE c.owner_user_id = $1
          ORDER BY u.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        result = await client.query(query, [userId, limit, skip]);

        const countQuery = `
          SELECT COUNT(DISTINCT u.id) as total
          FROM users u
          JOIN job_recruiter_assignments jra ON u.id = jra.recruiter_id
          JOIN job_descriptions j ON jra.job_id = j.id
          JOIN clients c ON j.client_id = c.id
          WHERE c.owner_user_id = $1
        `;
        const countResult = await client.query(countQuery, [userId]);
        total = parseInt(countResult.rows[0].total);
      } else {
        // Other roles are forbidden
        res.status(403).json({
          error: "Forbidden",
          message: "Only admins and client managers can view users",
        });
        return;
      }

      const users: User[] = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role,
        is_active: row.is_active,
        tenant_id: row.tenant_id,
        created_at: row.created_at,
      }));

      res.json({
        users,
        total,
        skip,
        limit,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch users",
    });
  }
};

// Get team members for a team lead
export const getMyTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const tenantId = (req as any).user?.tenant_id || "default";

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
      });
      return;
    }

    // Only team leads and admins can access this endpoint
    if (userRole !== 'team_lead' && userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only team leads and admins can view team members",
      });
      return;
    }

    const client = await getClient();
    try {
      let query = `
        SELECT 
          u.id,
          u.email,
          u.role,
          u.is_active,
          u.team_lead_id,
          COALESCE(COUNT(DISTINCT jra.id), 0) as active_assignment_count
        FROM users u
        LEFT JOIN job_recruiter_assignments jra ON u.id = jra.recruiter_id
        WHERE u.tenant_id = $1
          AND u.role = 'recruiter'
      `;

      const params: any[] = [tenantId];
      let paramCount = 1;

      // Team leads can only see their own team members
      if (userRole === 'team_lead') {
        paramCount++;
        query += ` AND u.team_lead_id = $${paramCount}`;
        params.push(userId);
      }

      // Admins can see all recruiters (no additional filter needed)
      // If you want to restrict admins to specific teams, add logic here

      query += `
        GROUP BY u.id, u.email, u.role, u.is_active, u.team_lead_id
        ORDER BY u.email
      `;

      const result = await client.query(query, params);

      const teamMembers: TeamMember[] = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role,
        is_active: row.is_active,
        active_assignment_count: parseInt(row.active_assignment_count),
        team_lead_id: row.team_lead_id,
      }));

      res.json({
        team_members: teamMembers,
        count: teamMembers.length,
        user_role: userRole,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get my team error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch team members",
    });
  }
};

// Update user role
export const updateUserRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const userRole = (req as any).user?.role;

    // Only admins can update user roles
    if (userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only admins can update user roles",
      });
      return;
    }

    const client = await getClient();
    try {
      const result = await client.query(
        "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role",
        [role, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        message: "User role updated successfully",
        user: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to update user role",
    });
  }
};

// Activate user
export const activateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;

    // Only admins can activate users
    if (userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only admins can activate users",
      });
      return;
    }

    const client = await getClient();
    try {
      const result = await client.query(
        "UPDATE users SET is_active = true WHERE id = $1 RETURNING id, email, is_active",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        message: "User activated successfully",
        user: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to activate user",
    });
  }
};

// Deactivate user
export const deactivateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;

    // Only admins can deactivate users
    if (userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only admins can deactivate users",
      });
      return;
    }

    const client = await getClient();
    try {
      const result = await client.query(
        "UPDATE users SET is_active = false WHERE id = $1 RETURNING id, email, is_active",
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        message: "User deactivated successfully",
        user: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to deactivate user",
    });
  }
};

// Create user
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, role } = req.body;
    const userRole = (req as any).user?.role;

    // Only admins can create users
    if (userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only admins can create users",
      });
      return;
    }

    // Validate input
    if (!email || !password || !role) {
      res.status(400).json({
        error: "Bad Request",
        message: "Email, password, and role are required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid email format",
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({
        error: "Bad Request",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    // Validate role
    const validRoles = ['admin', 'recruiter', 'team_lead', 'client_manager', 'bdm', 'viewer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        error: "Bad Request",
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`,
      });
      return;
    }

    const client = await getClient();
    try {
      // Check if email already exists
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({
          error: "Conflict",
          message: "Email already exists",
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const result = await client.query(
        `INSERT INTO users (id, email, hashed_password, role, is_active, tenant_id, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, true, 'default', NOW())
         RETURNING id, email, role, is_active, tenant_id, created_at`,
        [email, hashedPassword, role]
      );

      res.status(201).json({
        message: "User created successfully",
        user: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create user",
    });
  }
};