import { Request, Response } from "express";
import { getClient } from "../database/db";
import { authenticateToken } from "../middleware/auth.middleware";
import bcrypt from "bcryptjs";
import { buildScopeFilter } from "../utils/rbac.utils";

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

// Get all team leads
export const getTeamLeads = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const client = await getClient();
    try {
      const query = `
        SELECT id, email, role, is_active, created_at
        FROM users
        WHERE role = 'team_lead' AND is_active = true
        ORDER BY email ASC
      `;
      const result = await client.query(query);

      res.json({
        team_leads: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get team leads error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all users with pagination
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const client = await getClient();
    try {
      // Use dynamic scoping for users list
      const scope = buildScopeFilter((req as any).user, 'users', 'u');
      
      let conditions = ['1=1'];
      let queryParams: any[] = [...scope.params];
      let paramCount = scope.params.length;

      if (scope.sql) {
        let scopeSql = scope.sql;
        if (scopeSql.includes('$PARAM')) {
          scopeSql = scopeSql.replace('$PARAM', '$1'); 
        }
        // scope.sql starts with AND, so we can just append it or strip AND
        conditions.push(scopeSql.replace(/^\s*AND\s+/i, ''));
      }

      if (search) {
        paramCount++;
        conditions.push(`(u.email ILIKE $${paramCount} OR u.id::text ILIKE $${paramCount})`);
        queryParams.push(`%${search}%`);
      }

      if (role && role !== 'All Roles') {
        paramCount++;
        conditions.push(`u.role = $${paramCount}`);
        queryParams.push(role);
      }

      if (status && status !== 'All Status') {
        if (status.toLowerCase() === 'active') {
          conditions.push(`u.is_active = true`);
        } else if (status.toLowerCase() === 'inactive') {
          conditions.push(`u.is_active = false`);
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total 
        FROM users u
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      const limitIndex = ++paramCount;
      const skipIndex = ++paramCount;
      
      const pagedParams = [...queryParams, limit, skip];

      const query = `
        SELECT DISTINCT u.id, u.email, u.role, u.is_active, u.tenant_id, u.created_at
        FROM users u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${limitIndex} OFFSET $${skipIndex}
      `;
      const result = await client.query(query, pagedParams);

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

    const client = await getClient();
    try {
      const scope = buildScopeFilter((req as any).user, 'users', 'u');
      
      let scopeSql = scope.sql;
      if (scopeSql.includes('$PARAM')) {
        scopeSql = scopeSql.replace('$PARAM', '$2'); // $1 is tenantId
      }
      
      const query = `
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
          AND u.role IN ('recruiter', 'team_lead', 'admin')
          ${scopeSql}
        GROUP BY u.id, u.email, u.role, u.is_active, u.team_lead_id
        ORDER BY u.email
      `;

      const params: any[] = [tenantId, ...scope.params];
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

// Update user team lead
export const updateUserTeamLead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { team_lead_id } = req.body;
    const userRole = (req as any).user?.role;

    if (userRole !== 'admin') {
      res.status(403).json({
        error: "Forbidden",
        message: "Only admins can update team leads",
      });
      return;
    }

    const client = await getClient();
    try {
      const result = await client.query(
        "UPDATE users SET team_lead_id = $1 WHERE id = $2 RETURNING id, email, team_lead_id",
        [team_lead_id || null, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        message: "User team lead updated successfully",
        user: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update team lead error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to update team lead",
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

    const client = await getClient();
    try {
      // Validate role dynamically from database
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE name = $1",
        [role]
      );
      if (roleResult.rows.length === 0) {
        res.status(400).json({
          error: "Bad Request",
          message: `Invalid role: ${role}`,
        });
        return;
      }
      const roleId = roleResult.rows[0].id;

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
        `INSERT INTO users (id, email, hashed_password, role, role_id, is_active, tenant_id, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, 'default', NOW())
         RETURNING id, email, role, is_active, tenant_id, created_at`,
        [email, hashedPassword, role, roleId]
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