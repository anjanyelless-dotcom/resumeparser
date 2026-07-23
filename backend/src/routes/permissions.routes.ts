import { Router } from "express";
import {
  getUserPermissions,
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getAllRoles,
  // Enterprise RBAC
  getActions,
  getScopes,
  getRbacModules,
  getSidebarModules,
  getRoleSidebarPermissions,
  updateRoleSidebarPermissions,
  getEnterpriseRoleConfig,
  saveEnterpriseRoleConfig,
  cloneRolePermissions,
} from "../controllers/permissions.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

// All permission routes require authentication
router.use(authenticateToken);

// ── Public catalog routes (any authenticated user) ──────────────────────────
router.get("/me", getUserPermissions);
router.get("/", getAllPermissions);
router.get("/roles", getAllRoles);

// Dynamic catalogs
router.get("/actions", getActions);
router.get("/scopes", getScopes);
router.get("/rbac-modules", getRbacModules);
router.get("/sidebar-modules", getSidebarModules);

// ── Admin-only routes ────────────────────────────────────────────────────────
router.use(requireRole(["admin"]));

// Legacy role-permission endpoints (backward compatible)
router.get("/role-permissions/:roleId", getRolePermissions);
router.put("/role-permissions/:roleId", updateRolePermissions);

// Enterprise RBAC endpoints
router.get("/role/:roleId/configuration", getEnterpriseRoleConfig);
router.get("/role/:roleId/sidebar", getRoleSidebarPermissions);
router.put("/role/:roleId/sidebar", updateRoleSidebarPermissions);
router.put("/role/:roleId/save", saveEnterpriseRoleConfig);
router.post("/role/:roleId/clone", cloneRolePermissions);

export default router;