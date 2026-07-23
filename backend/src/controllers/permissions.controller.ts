import { Request, Response } from "express";
import { query, getClient } from "../database/db";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

// Helper function to write audit logs
const writePermissionsAuditLog = async (
  userId: string,
  action: string,
  details: any = null,
  ipAddress?: string
) => {
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        crypto.randomUUID(),
        userId,
        action,
        "role_permissions",
        details.role_id || "system",
        ipAddress,
        JSON.stringify(details),
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log:", error);
  } finally {
    client.release();
  }
};

/**
 * @swagger
 * /api/permissions/me:
 *   get:
 *     summary: Get current user's permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       module_name:
 *                         type: string
 *                       action_name:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export const getUserPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }



    // User has roleId, query by UUID — use new module-based role_permissions
    let dbPermissions: any[] = [];
    if (req.user.roleId) {
      const result = await query(
        `SELECT m.name as module_name, rp.action as action_name
         FROM role_permissions rp
         JOIN modules m ON m.id = rp.module_id
         WHERE rp.role_id = $1 AND rp.allowed = true
         ORDER BY m.name, rp.action`,
        [req.user.roleId]
      );
      dbPermissions = result.rows;

      // Dynamically grant 'view' permission for any module that is visible in the sidebar
      const sidebarResult = await query(
        `SELECT sm.name as module_name
         FROM role_sidebar_permissions rsp
         JOIN sidebar_modules sm ON sm.id = rsp.sidebar_module_id
         WHERE rsp.role_id = $1 AND rsp.visible = true`,
        [req.user.roleId]
      );

      for (const row of sidebarResult.rows) {
        if (!dbPermissions.find(p => p.module_name === row.module_name && p.action_name === 'view')) {
          dbPermissions.push({ module_name: row.module_name, action_name: 'view' });
        }
      }

      // Ensure essential modules are always viewable
      const essentials = ['dashboard', 'dashboard_parent', 'profile'];
      for (const e of essentials) {
        if (!dbPermissions.find(p => p.module_name === e && p.action_name === 'view')) {
           dbPermissions.push({ module_name: e, action_name: 'view' });
        }
      }
    }

    // If DB returned permissions, use them
    if (dbPermissions.length > 0) {
      res.json({ permissions: dbPermissions });
      return;
    }

    // FALLBACK: If user has no permissions seeded in the DB, fallback to legacy role defaults
    const defaultPermissions: any[] = [];
    
    // Add base permissions everyone gets
    defaultPermissions.push({ module_name: 'dashboard', action_name: 'view' });
    defaultPermissions.push({ module_name: 'profile', action_name: 'view' });
    defaultPermissions.push({ module_name: 'profile', action_name: 'edit' });

    if (req.user.role === 'recruiter') {
      defaultPermissions.push({ module_name: 'candidates', action_name: 'view' });
      defaultPermissions.push({ module_name: 'candidates', action_name: 'create' });
      defaultPermissions.push({ module_name: 'candidates', action_name: 'edit' });
      defaultPermissions.push({ module_name: 'jobs', action_name: 'view' });
      defaultPermissions.push({ module_name: 'requirements', action_name: 'view' });
      defaultPermissions.push({ module_name: 'interviews', action_name: 'view_own' });
      defaultPermissions.push({ module_name: 'upload', action_name: 'view' });
      defaultPermissions.push({ module_name: 'upload', action_name: 'create' });
      defaultPermissions.push({ module_name: 'matching', action_name: 'view' });
      defaultPermissions.push({ module_name: 'labeling', action_name: 'view' });
      defaultPermissions.push({ module_name: 'analytics', action_name: 'view' });
      defaultPermissions.push({ module_name: 'settings', action_name: 'view' });
    } else if (req.user.role === 'team_lead') {
      defaultPermissions.push({ module_name: 'candidates', action_name: 'view' });
      defaultPermissions.push({ module_name: 'candidates', action_name: 'create' });
      defaultPermissions.push({ module_name: 'candidates', action_name: 'edit' });
      defaultPermissions.push({ module_name: 'candidates', action_name: 'delete' });
      defaultPermissions.push({ module_name: 'jobs', action_name: 'view' });
      defaultPermissions.push({ module_name: 'jobs', action_name: 'create' });
      defaultPermissions.push({ module_name: 'jobs', action_name: 'edit' });
      defaultPermissions.push({ module_name: 'requirements', action_name: 'view' });
      defaultPermissions.push({ module_name: 'requirements', action_name: 'create' });
      defaultPermissions.push({ module_name: 'requirements', action_name: 'edit' });
      defaultPermissions.push({ module_name: 'interviews', action_name: 'view' });
      defaultPermissions.push({ module_name: 'upload', action_name: 'view' });
      defaultPermissions.push({ module_name: 'upload', action_name: 'create' });
      defaultPermissions.push({ module_name: 'matching', action_name: 'view' });
      defaultPermissions.push({ module_name: 'labeling', action_name: 'view' });
      defaultPermissions.push({ module_name: 'labeling', action_name: 'edit' });
      defaultPermissions.push({ module_name: 'analytics', action_name: 'view' });
      defaultPermissions.push({ module_name: 'settings', action_name: 'view' });
    } else if (req.user.role === 'viewer') {
      defaultPermissions.push({ module_name: 'candidates', action_name: 'view' });
      defaultPermissions.push({ module_name: 'jobs', action_name: 'view' });
      defaultPermissions.push({ module_name: 'requirements', action_name: 'view' });
      defaultPermissions.push({ module_name: 'interviews', action_name: 'view_own' });
    }

    res.json({ permissions: defaultPermissions });
  } catch (error) {
    console.error("Get user permissions error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve user permissions" });
  }
};

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get full permission catalog
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission catalog retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       module_name:
 *                         type: string
 *                       action_name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getAllPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      "SELECT id, module_name, action_name, description FROM permissions ORDER BY module_name, action_name"
    );

    res.json({ permissions: result.rows });
  } catch (error) {
    console.error("Get all permissions error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve permission catalog" });
  }
};

/**
 * @swagger
 * /api/role-permissions/{roleId}:
 *   get:
 *     summary: Get permissions for a specific role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       module_name:
 *                         type: string
 *                       action_name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       granted_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */
export const getRolePermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roleId } = req.params;
    const roleIdString = Array.isArray(roleId) ? roleId[0] : roleId;

    if (!roleIdString) {
      res.status(400).json({ error: "Bad Request", message: "Role ID is required" });
      return;
    }

    // Resolve role by UUID or name
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleIdString);
    const roleResult = isUUID
      ? await query("SELECT id, name, description FROM roles WHERE id = $1 AND deleted_at IS NULL", [roleIdString])
      : await query("SELECT id, name, description FROM roles WHERE name = $1 AND deleted_at IS NULL", [roleIdString]);

    if (roleResult.rows.length === 0) {
      res.status(404).json({ error: "Not Found", message: "Role not found" });
      return;
    }

    const role = roleResult.rows[0];

    // Get permissions from new module-based role_permissions table
    const permissionsResult = await query(
      `SELECT m.id, m.name as module_name, rp.action as action_name
       FROM role_permissions rp
       JOIN modules m ON m.id = rp.module_id
       WHERE rp.role_id = $1 AND rp.allowed = true
       ORDER BY m.name, rp.action`,
      [role.id]
    );

    res.json({ role, permissions: permissionsResult.rows });
  } catch (error) {
    console.error("Get role permissions error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve role permissions" });
  }
};

/**
 * @swagger
 * /api/role-permissions/{roleId}:
 *   put:
 *     summary: Update permissions for a specific role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of permission IDs to assign to the role
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 role:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       module_name:
 *                         type: string
 *                       action_name:
 *                         type: string
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */
export const updateRolePermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roleId } = req.params;
    const roleIdString = Array.isArray(roleId) ? roleId[0] : roleId;
    const { permissionIds } = req.body;

    if (!roleIdString) {
      res.status(400).json({ error: "Bad Request", message: "Role ID is required" });
      return;
    }

    if (!Array.isArray(permissionIds)) {
      res.status(400).json({ error: "Bad Request", message: "permissionIds must be an array" });
      return;
    }

    // Validate that all permission IDs exist
    if (permissionIds.length > 0) {
      const validPermissionsResult = await query(
        "SELECT id FROM permissions WHERE id = ANY($1)",
        [permissionIds]
      );

      if (validPermissionsResult.rows.length !== permissionIds.length) {
        res.status(400).json({ error: "Bad Request", message: "One or more permission IDs are invalid" });
        return;
      }
    }

    // Since we're using string-based roles, get the UUID from the roles table
    const roleResult = await query(
      "SELECT id, name FROM roles WHERE name = $1",
      [roleIdString]
    );

    if (roleResult.rows.length === 0) {
      res.status(404).json({ error: "Not Found", message: "Role not found" });
      return;
    }

    const roleUuid = roleResult.rows[0].id;

    // Start transaction
    await query("BEGIN");

    try {
      // Delete existing role permissions
      await query(
        "DELETE FROM role_permissions WHERE role_id = $1",
        [roleUuid]
      );

      // Insert new role permissions if any provided
      if (permissionIds.length > 0) {
        const values = permissionIds.map((permissionId: string, index: number) => 
          `($1, $${index + 2}, NOW())`
        ).join(', ');

        const insertQuery = `
          INSERT INTO role_permissions (role_id, permission_id, granted_at)
          VALUES ${values}
        `;

        const params = [roleUuid, ...permissionIds];
        await query(insertQuery, params);
      }

      // Commit transaction
      await query("COMMIT");

      // Get updated permissions for response
      const updatedPermissionsResult = await query(
        `SELECT p.id, p.module_name, p.action_name
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1
         ORDER BY p.module_name, p.action_name`,
        [roleUuid]
      );

      // Write audit log
      await writePermissionsAuditLog(
        req.user!.id,
        "UPDATE_ROLE_PERMISSIONS",
        {
          role_id: roleUuid,
          role_name: roleIdString,
          new_permissions: permissionIds,
          updated_by: req.user!.email,
        },
        req.ip
      );

      res.json({
        message: "Role permissions updated successfully",
        role: {
          id: roleUuid,
          name: roleIdString,
          description: `${roleIdString.charAt(0).toUpperCase() + roleIdString.slice(1)} role`
        },
        permissions: updatedPermissionsResult.rows
      });
    } catch (error) {
      // Rollback on error
      await query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Update role permissions error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to update role permissions" });
  }
};

export const getAllRoles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, description, status, is_system, role_type, version,
              default_scope, created_at, updated_at
       FROM roles
       WHERE deleted_at IS NULL
       ORDER BY is_system DESC, name ASC`
    );

    // Get user count per role
    const userCountResult = await query(
      `SELECT role, COUNT(*) as user_count FROM users WHERE role IS NOT NULL GROUP BY role`
    );
    const userCountMap: Record<string, number> = {};
    userCountResult.rows.forEach((row: any) => {
      userCountMap[row.role] = parseInt(row.user_count);
    });

    const roles = result.rows.map((row: any) => ({
      ...row,
      user_count: userCountMap[row.name] || 0,
    }));

    res.json({ roles });
  } catch (error) {
    console.error("Get all roles error:", error);
    res.status(500).json({ error: "Internal server error", message: "Failed to retrieve roles" });
  }
};

// ============================================================
// ENTERPRISE RBAC — New Controllers
// ============================================================

/** GET /api/permissions/actions — dynamic actions catalog */
export const getActions = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, display_name, sort_order
       FROM actions
       WHERE deleted_at IS NULL
       ORDER BY sort_order ASC`
    );
    res.json({ actions: result.rows });
  } catch (error) {
    console.error("Get actions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/permissions/scopes — data access scopes */
export const getScopes = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, INITCAP(REPLACE(name, '_', ' ')) as display_name
       FROM scopes
       ORDER BY name ASC`
    );
    res.json({ scopes: result.rows });
  } catch (error) {
    console.error("Get scopes error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/permissions/rbac-modules — modules list for the permission matrix */
export const getRbacModules = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Use the existing 'modules' table (the one role_permissions.module_id references)
    const result = await query(
      `SELECT id, name, display_name, COALESCE(parent_module_id::text, 'root') as category,
              sort_order
       FROM modules
       ORDER BY sort_order ASC NULLS LAST, name ASC`
    );

    // Group by parent_module (use display_name of parent as category label)
    const parents = result.rows.filter((m: any) => !m.parent_module_id);
    const grouped: Record<string, any[]> = {};
    result.rows.forEach((mod: any) => {
      const cat = mod.category === 'root' ? 'General' : mod.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(mod);
    });

    res.json({ modules: result.rows, grouped });
  } catch (error) {
    console.error("Get rbac modules error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/permissions/sidebar-modules — hierarchical sidebar structure */
export const getSidebarModules = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, display_name, parent_id, group_name, icon, route, sort_order, is_active
       FROM sidebar_modules
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY sort_order ASC`
    );

    // Build tree
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter((i: any) => (i.parent_id || null) === parentId)
        .map((i: any) => ({ ...i, children: buildTree(items, i.id) }))
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
    };

    res.json({ sidebar_modules: result.rows, tree: buildTree(result.rows) });
  } catch (error) {
    console.error("Get sidebar modules error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/permissions/role/:roleId/sidebar — sidebar visibility for a role */
export const getRoleSidebarPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roleId } = req.params;
    const result = await query(
      `SELECT sm.id as sidebar_module_id, sm.name, sm.display_name, sm.parent_id,
              sm.icon, sm.route, sm.sort_order,
              COALESCE(rsp.visible, false) as visible
       FROM sidebar_modules sm
       LEFT JOIN role_sidebar_permissions rsp ON rsp.sidebar_module_id = sm.id AND rsp.role_id = $1
       WHERE sm.is_active = true AND sm.deleted_at IS NULL
       ORDER BY sm.sort_order ASC`,
      [roleId]
    );
    res.json({ sidebar_permissions: result.rows });
  } catch (error) {
    console.error("Get role sidebar permissions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/permissions/role/:roleId/configuration — aggregated config for the UI */
export const getEnterpriseRoleConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roleId } = req.params;

    // Role info
    const roleResult = await query(
      `SELECT r.id, r.name, r.description, r.status, r.is_system, r.role_type, r.version,
              r.default_scope, r.created_at, r.updated_at,
              u.full_name as updated_by_name
       FROM roles r
       LEFT JOIN users u ON u.id = r.updated_by
       WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [roleId]
    );
    if (roleResult.rows.length === 0) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    const userCountResult = await query(
      `SELECT COUNT(*) as count FROM users WHERE role = $1`,
      [roleResult.rows[0].name]
    );

    // Module permissions — join modules table (no 'category' column there)
    const permResult = await query(
      `SELECT rp.module_id, rp.action, rp.allowed, rp.scope_id, rp.sidebar_visible,
              m.name as module_name, m.display_name
       FROM role_permissions rp
       JOIN modules m ON m.id = rp.module_id
       WHERE rp.role_id = $1
       ORDER BY m.name, rp.action`,
      [roleId]
    );

    // Sidebar permissions
    const sidebarResult = await query(
      `SELECT sm.id as sidebar_module_id, sm.name, sm.display_name, sm.parent_id,
              sm.icon, sm.route, sm.sort_order,
              COALESCE(rsp.visible, false) as visible
       FROM sidebar_modules sm
       LEFT JOIN role_sidebar_permissions rsp ON rsp.sidebar_module_id = sm.id AND rsp.role_id = $1
       WHERE sm.is_active = true AND sm.deleted_at IS NULL
       ORDER BY sm.sort_order ASC`,
      [roleId]
    );

    res.json({
      role: {
        ...roleResult.rows[0],
        user_count: parseInt(userCountResult.rows[0].count),
      },
      module_permissions: permResult.rows,
      sidebar_permissions: sidebarResult.rows,
    });
  } catch (error) {
    console.error("Get enterprise role config error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** PUT /api/permissions/role/:roleId/sidebar — save sidebar visibility */
export const updateRoleSidebarPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roleId } = req.params;
  const { sidebar_permissions } = req.body; // [{ sidebar_module_id, visible }]

  if (!Array.isArray(sidebar_permissions)) {
    res.status(400).json({ error: "sidebar_permissions must be an array" });
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Delete existing
    await client.query(`DELETE FROM role_sidebar_permissions WHERE role_id = $1`, [roleId]);

    // Bulk insert
    for (const sp of sidebar_permissions) {
      await client.query(
        `INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible)
         VALUES ($1, $2, $3)
         ON CONFLICT (role_id, sidebar_module_id) DO UPDATE SET visible = EXCLUDED.visible`,
        [roleId, sp.sidebar_module_id, sp.visible]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Sidebar permissions updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update role sidebar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/permissions/role/:roleId/save
 * Unified transactional save with optimistic concurrency control.
 * Payload: { version, sidebarPermissions, modulePermissions, defaultScope }
 */
export const saveEnterpriseRoleConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roleId } = req.params;
  const { version, sidebar_permissions, module_permissions, default_scope } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // --- Optimistic Concurrency Control ---
    const roleResult = await client.query(
      `SELECT id, name, version, is_system FROM roles WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [roleId]
    );
    if (roleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    const currentRole = roleResult.rows[0];

    if (version !== undefined && currentRole.version !== version) {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: 'Concurrency conflict',
        message: 'This role has been modified by another administrator. Please reload and try again.',
      });
      return;
    }

    // --- System Role Protection ---
    if (currentRole.is_system) {
      // System roles can be edited but their critical modules cannot be fully stripped
      const criticalModules = ['roles_permissions', 'users', 'audit_logs', 'general_settings'];
      if (module_permissions) {
        for (const critMod of criticalModules) {
          const hasView = module_permissions.some(
            (p: any) => p.module_name === critMod && p.action === 'view' && p.allowed
          );
          if (!hasView) {
            await client.query('ROLLBACK');
            res.status(400).json({
              error: 'System role protection',
              message: `Cannot remove View access for critical module '${critMod}' on a system role.`,
            });
            return;
          }
        }
      }
    }

    // --- Save Module Permissions ---
    if (Array.isArray(module_permissions)) {
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
      for (const perm of module_permissions) {
        await client.query(
          `INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (role_id, module_id, action)
           DO UPDATE SET allowed = EXCLUDED.allowed, scope_id = EXCLUDED.scope_id, sidebar_visible = EXCLUDED.sidebar_visible`,
          [roleId, perm.module_id, perm.action, perm.allowed, perm.scope_id || null, perm.sidebar_visible || false]
        );
      }
    }

    // --- Save Sidebar Permissions ---
    if (Array.isArray(sidebar_permissions)) {
      await client.query(`DELETE FROM role_sidebar_permissions WHERE role_id = $1`, [roleId]);
      for (const sp of sidebar_permissions) {
        await client.query(
          `INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible)
           VALUES ($1, $2, $3)
           ON CONFLICT (role_id, sidebar_module_id) DO UPDATE SET visible = EXCLUDED.visible`,
          [roleId, sp.sidebar_module_id, sp.visible]
        );
      }
    }

    // --- Update Role metadata (version bump, default_scope) ---
    await client.query(
      `UPDATE roles
       SET version = version + 1,
           default_scope = COALESCE($1, default_scope),
           updated_at = NOW(),
           updated_by = $2
       WHERE id = $3`,
      [default_scope || null, req.user!.id, roleId]
    );

    // --- Audit Log ---
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        crypto.randomUUID(),
        req.user!.id,
        'SAVE_ENTERPRISE_ROLE_CONFIG',
        'roles',
        roleId,
        JSON.stringify({ role_name: currentRole.name, version: currentRole.version + 1, updated_by: req.user!.email }),
      ]
    );

    await client.query('COMMIT');
    res.json({ message: 'Role configuration saved successfully', new_version: currentRole.version + 1 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Save enterprise role config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/** POST /api/permissions/role/:roleId/clone — clone a role's full permissions */
export const cloneRolePermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roleId } = req.params;        // source role
  const { targetRoleId } = req.body;   // destination role

  if (!targetRoleId) {
    res.status(400).json({ error: 'targetRoleId is required' });
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Clone module permissions
    await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [targetRoleId]);
    await client.query(
      `INSERT INTO role_permissions (role_id, module_id, action, allowed, scope_id, sidebar_visible)
       SELECT $2, module_id, action, allowed, scope_id, sidebar_visible
       FROM role_permissions WHERE role_id = $1`,
      [roleId, targetRoleId]
    );

    // Clone sidebar permissions
    await client.query(`DELETE FROM role_sidebar_permissions WHERE role_id = $1`, [targetRoleId]);
    await client.query(
      `INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible)
       SELECT $2, sidebar_module_id, visible
       FROM role_sidebar_permissions WHERE role_id = $1`,
      [roleId, targetRoleId]
    );

    // Bump target version
    await client.query(
      `UPDATE roles SET version = version + 1, updated_at = NOW(), updated_by = $1 WHERE id = $2`,
      [req.user!.id, targetRoleId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Role permissions cloned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Clone role permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};