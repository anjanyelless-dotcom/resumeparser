import { Router } from "express";
import { authenticateToken, requirePermission } from "../middleware/auth.middleware";
import { 
  getRoles, 
  getSidebar, 
  getAllSidebarModules, 
  getModules, 
  getActions, 
  getRoleConfiguration, 
  updateRoleConfiguration,
  getScopes
} from "../controllers/rbac.controller";

const router = Router();

// Secure all RBAC routes with authentication
router.use(authenticateToken);

// Admin-only routes
router.get("/roles", requirePermission('settings', 'view'), getRoles);
router.get("/scopes", requirePermission('settings', 'view'), getScopes);
router.get("/sidebar/all", requirePermission('settings', 'view'), getAllSidebarModules);
router.get("/modules", requirePermission('settings', 'view'), getModules);
router.get("/actions", requirePermission('settings', 'view'), getActions);
router.get("/roles/:roleId/configuration", requirePermission('settings', 'view'), getRoleConfiguration);
router.put("/roles/:roleId", requirePermission('settings', 'edit'), updateRoleConfiguration);

// Route accessible to any authenticated user to get their own sidebar
router.get("/sidebar", getSidebar);

export default router;
