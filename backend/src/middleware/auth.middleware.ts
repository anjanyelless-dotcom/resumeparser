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
  };
}

type AuthRequest = AuthenticatedRequest;

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  console.log('[authenticateToken] Token present:', !!token);

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "fallback-secret",
    (err, decoded) => {
      if (err) {
        console.log('[authenticateToken] Token verification failed:', err.message);
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }

      console.log('[authenticateToken] Token decoded:', decoded);
      req.user = {
        id: (decoded as any).id,
        email: (decoded as any).email,
        role: (decoded as any).role,
        roleId: (decoded as any).roleId,
        roleName: (decoded as any).roleName,
      };
      next();
    },
  );
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
    console.log(`[requirePermission] Check for ${moduleName}:${actionName}`);
    console.log('[requirePermission] User:', req.user);
    
    if (!req.user) {
      console.log('[requirePermission] No user found');
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // TEMPORARY: Allow all authenticated users to access all routes
    console.log("[Permission Check] Allowing access for authenticated user:", req.user.email);
    return next();

    // Original permission check logic below (commented out for now)
    /*
    console.log("[Permission Check] User:", {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      roleId: req.user.roleId
    });
    console.log("[Permission Check] Required:", { module: moduleName, action: actionName });

    // If user doesn't have roleId, fall back to legacy role check
    if (!req.user.roleId) {
      // For backward compatibility, allow admin users to access everything
      if (req.user.role === 'admin') {
        console.log("[Permission Check] Admin user - allowing access");
        return next();
      }

      // Allow client_manager to access communications, clients, dashboard, submissions, interviews, upload, matching, labeling, analytics, and settings
      if (req.user.role === 'client_manager') {
        if (['communications', 'clients', 'dashboard', 'submissions', 'interviews', 'upload', 'matching', 'labeling', 'analytics', 'settings'].includes(moduleName)) {
          console.log(`[Permission Check] Client manager accessing ${moduleName} - allowing access`);
          return next();
        }
      }

      // Allow recruiter to access jobs, candidates, dashboard, requirements, interviews, upload, matching, labeling, analytics, and settings
      if (req.user.role === 'recruiter') {
        if (['jobs', 'candidates', 'dashboard', 'requirements', 'interviews', 'upload', 'matching', 'labeling', 'analytics', 'settings'].includes(moduleName)) {
          console.log(`[Permission Check] Recruiter accessing ${moduleName} - allowing access`);
          return next();
        }
      }

      // Allow team_lead to access jobs, candidates, dashboard, requirements, interviews, upload, matching, labeling, analytics, and settings
      if (req.user.role === 'team_lead') {
        if (['jobs', 'candidates', 'dashboard', 'requirements', 'interviews', 'upload', 'matching', 'labeling', 'analytics', 'settings'].includes(moduleName)) {
          console.log(`[Permission Check] Team lead accessing ${moduleName} - allowing access`);
          return next();
        }
      }

      // Allow bdm to access jobs, candidates, dashboard, requirements, clients, reports, and settings
      if (req.user.role === 'bdm') {
        if (['jobs', 'candidates', 'dashboard', 'requirements', 'clients', 'reports', 'settings'].includes(moduleName)) {
          console.log(`[Permission Check] BDM accessing ${moduleName} - allowing access`);
          return next();
        }
      }

      // For other users without roleId, deny access to permission-protected routes
      console.log("[Permission Check] No roleId - denying access");
      res.status(403).json({ error: "Insufficient permissions - role not assigned" });
      return;
    }

    try {
      // Check if the user's role has the required permission
      const permissionCheck = await query(
        `SELECT 1 
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role = $1 
         AND p.module = $2 
         AND p.name = $3`,
        [req.user.role, moduleName, `${moduleName}.${actionName}`]
      );

      console.log("[Permission Check] Result:", {
        hasPermission: permissionCheck.rows.length > 0,
        rows: permissionCheck.rows.length
      });

      if (permissionCheck.rows.length === 0) {
        console.log("[Permission Check] Permission denied");
        res.status(403).json({ 
          error: "Insufficient permissions",
          details: `Missing permission: ${moduleName}.${actionName}`
        });
        return;
      }

      console.log("[Permission Check] Permission granted");
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Internal server error during permission check" });
    }
    */
  };
};
