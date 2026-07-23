import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { query } from "../database/db";
import { isValidRole, hasPermission } from "../constants/roles";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;        // Legacy role for backward compatibility
    roleId?: string;     // New role UUID
    roleName?: string;   // New role name
    scope?: string;      // Current permission scope
    permissions?: string[]; // Array of module:action strings
  };
}

type AuthRequest = AuthenticatedRequest;

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  // console.log('[authenticateToken] Token present:', !!token);

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");

    // console.log('[authenticateToken] Token decoded:', decoded);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      roleId: decoded.roleId,
      roleName: decoded.roleName,
      permissions: [],
    };

    // Load permissions for this user's role
    const permissionsQuery = await query(
      `SELECT m.name as module_name, rp.action as action_name 
       FROM role_permissions rp
       JOIN modules m ON rp.module_id = m.id
       JOIN roles r ON rp.role_id = r.id
       WHERE (r.name = $1 OR r.id::text = $2)
       AND rp.allowed = true`,
      [req.user.role, req.user.roleId || null]
    );

    req.user.permissions = permissionsQuery.rows.map(row => `${row.module_name}:${row.action_name}`);

    next();
  } catch (err: any) {
    console.log('[authenticateToken] Auth failed:', err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Validate user role
    if (!isValidRole(req.user.role)) {
      res.status(403).json({ error: "Invalid user role" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
};

export const requirePermission = (moduleName: string, actionName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // console.log(`[requirePermission] Check for ${moduleName}:${actionName}`);

    if (!req.user) {
      console.log('[requirePermission] No user found');
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const perms = req.user.permissions || [];

      // Check if they have the exact permission, or 'view' which often encompasses 'view_own' depending on module logic
      const hasExactPermission = perms.includes(`${moduleName}:${actionName}`);

      // For some endpoints, possessing 'view_own' or 'view_team' grants access to the route (controller handles filtering)
      const hasAnyView = perms.includes(`${moduleName}:view`) ||
        perms.includes(`${moduleName}:view_own`) ||
        perms.includes(`${moduleName}:view_team`) ||
        perms.includes(`${moduleName}:view_assigned`) ||
        perms.includes(`${moduleName}:view_own_clients`);

      const isViewAction = actionName === 'view' || actionName === 'view_own' || actionName === 'view_team' || actionName === 'view_bdm' || actionName === 'view_assigned' || actionName === 'view_own_clients';

      if (!hasExactPermission && !(isViewAction && hasAnyView)) {
        console.log(`[Permission Check] Permission denied for ${moduleName}:${actionName}. User has: ${perms.join(', ')}`);
        res.status(403).json({
          error: "Insufficient permissions",
          details: `Missing permission: ${moduleName}:${actionName}`
        });
        return;
      }

      // If they passed, we let the controller handle the strict Data Scope filtering
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Internal server error during permission check" });
    }
  };
};
