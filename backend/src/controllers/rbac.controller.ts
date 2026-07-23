import { Request, Response } from "express";
import pool from "../database/db";

export const getRoles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.name, r.description, r.status, r.is_system, 
              r.default_scope 
       FROM roles r 
       WHERE r.deleted_at IS NULL AND r.name != 'super_admin'
       ORDER BY r.name`
    );
    res.json({ success: true, roles: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSidebar = async (req: Request, res: Response) => {
  try {
    const { role } = (req as any).user;
    let query = `
      SELECT sm.* 
      FROM sidebar_modules sm
      JOIN role_sidebar_permissions rsp ON sm.id = rsp.sidebar_module_id
      JOIN roles r ON rsp.role_id = r.id
      WHERE r.name = $1 AND rsp.visible = true AND sm.is_active = true
    `;
    
    let result = await pool.query(query, [role]);
    
    // FALLBACK: If sidebar permissions are not seeded in DB, return basic default modules
    if (result.rows.length === 0) {
      let allowedNames: string[] = [];
      if (role === 'recruiter') {
        allowedNames = [
          'dashboard', 'dashboard_parent', 
          'recruitment', 'candidates', 'upload_resume', 'boolean_search', 'xray_search', 
          'job_management', 'jobs', 'requirements', 'my_assignments',
          'hiring_process', 'interviews', 
          'reports', 'analytics_menu', 
          'ai_tools', 'ai_matching', 'jd_matching', 'model_test', 'section_preview', 'ai_resume_parser', 'ai_matching_tool', 'jd_analyzer',
          'settings', 'general_settings'
        ];
      } else if (role === 'team_lead') {
        allowedNames = [
          'dashboard', 'dashboard_parent',
          'recruitment', 'candidates', 'upload_resume', 'boolean_search', 'xray_search',
          'job_management', 'jobs', 'requirements', 'pipeline', 'my_assignments',
          'hiring_process', 'submissions', 'interviews', 'offers', 'placements',
          'reports', 'reports_menu', 'analytics_menu', 'team_performance',
          'ai_tools', 'ai_matching', 'jd_matching', 'model_test', 'section_preview', 'ai_resume_parser', 'ai_matching_tool', 'jd_analyzer',
          'settings', 'general_settings'
        ];
      } else if (role === 'bdm') {
        allowedNames = [
          'dashboard', 'dashboard_parent',
          'client_management', 'clients', 'client_pipeline', 'pipeline',
          'recruitment', 'candidates', 'requirements',
          'hiring_process', 'submissions',
          'reports', 'analytics_menu', 'reports_menu',
          'settings', 'general_settings'
        ];
      } else if (role === 'manager') {
        allowedNames = [
          'dashboard', 'dashboard_parent',
          'recruitment', 'candidates', 'upload_resume', 'boolean_search', 'xray_search',
          'job_management', 'jobs', 'requirements', 'pipeline', 'my_assignments',
          'client_management', 'clients', 'client_pipeline',
          'hiring_process', 'submissions', 'interviews',
          'reports', 'reports_menu', 'analytics_menu', 'team_performance',
          'ai_tools', 'ai_matching', 'jd_matching',
          'settings', 'general_settings'
        ];
      }
      
      if (role === 'admin' || role === 'super_admin') {
        const fallbackResult = await pool.query(`
          SELECT * FROM sidebar_modules 
          WHERE is_active = true
          ORDER BY sort_order
        `);
        result = fallbackResult;
      } else if (allowedNames.length > 0) {
        const fallbackResult = await pool.query(`
          SELECT * FROM sidebar_modules 
          WHERE name = ANY($1) AND is_active = true
          ORDER BY sort_order
        `, [allowedNames]);
        result = fallbackResult;
      }
    }

    res.json({ success: true, sidebar: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllSidebarModules = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM sidebar_modules WHERE is_active = true ORDER BY sort_order`);
    res.json({ success: true, sidebar_modules: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScopes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM scopes ORDER BY name`);
    res.json({ success: true, scopes: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getModules = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM modules ORDER BY category, sort_order`);
    res.json({ success: true, modules: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM actions ORDER BY sort_order`);
    res.json({ success: true, actions: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoleConfiguration = async (req: Request, res: Response) => {
  const { roleId } = req.params;
  try {
    const roleResult = await pool.query(`SELECT * FROM roles WHERE id = $1`, [roleId]);
    if (roleResult.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Role not found' });
      return;
    }
    
    const sidebarResult = await pool.query(
      `SELECT sidebar_module_id FROM role_sidebar_permissions WHERE role_id = $1 AND visible = true`, 
      [roleId]
    );
    
    const permsResult = await pool.query(
      `SELECT module_id, action as action_id, allowed, scope_id, sidebar_visible 
       FROM role_permissions 
       WHERE role_id = $1`, 
      [roleId]
    );
    
    res.json({
      success: true,
      role: roleResult.rows[0],
      sidebar_access: sidebarResult.rows.map(r => r.sidebar_module_id),
      permissions: permsResult.rows
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRoleConfiguration = async (req: Request, res: Response) => {
  const { roleId } = req.params;
  const { sidebar_permissions, module_permissions, default_scope } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    if (default_scope) {
      await client.query(`UPDATE roles SET default_scope = $1 WHERE id = $2`, [default_scope, roleId]);
    }
    
    if (sidebar_permissions && Array.isArray(sidebar_permissions)) {
      await client.query(`DELETE FROM role_sidebar_permissions WHERE role_id = $1`, [roleId]);
      for (const sm of sidebar_permissions) {
        await client.query(
          `INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible) VALUES ($1, $2, true)`,
          [roleId, sm.sidebar_module_id]
        );
      }
    }
    
    if (module_permissions && Array.isArray(module_permissions)) {
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
      for (const p of module_permissions) {
        await client.query(
          `INSERT INTO role_permissions (role_id, module_id, action, allowed) VALUES ($1, $2, $3, $4)`,
          [roleId, p.module_id, p.action, p.allowed]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Role configuration updated successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating role configuration:', error);
    require('fs').writeFileSync('rbac_error.txt', error.stack || error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};
