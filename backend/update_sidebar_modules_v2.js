const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'resume_parser',
  password: 'Surya@123',
  port: 5432,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Make all existing sidebar modules inactive to clean the slate
    await client.query('UPDATE sidebar_modules SET is_active = false');

    // 1. Define parents
    const parents = [
      { name: 'parent_bdm', display_name: 'BUSINESS DEVELOPMENT (BDM)', sort_order: 10, icon: 'briefcase' },
      { name: 'parent_manager', display_name: 'RECRUITMENT PLANNING (MANAGER)', sort_order: 20, icon: 'users' },
      { name: 'parent_team_lead', display_name: 'TEAM LEAD MANAGEMENT', sort_order: 30, icon: 'users' },
      { name: 'parent_recruiter', display_name: 'CANDIDATE SOURCING (RECRUITER)', sort_order: 40, icon: 'search' },
      { name: 'parent_ai', display_name: 'AI RECRUITMENT', sort_order: 50, icon: 'zap' },
      { name: 'parent_hiring', display_name: 'HIRING PROCESS (END TO END)', sort_order: 60, icon: 'git-merge' },
      { name: 'parent_team_management', display_name: 'TEAM MANAGEMENT', sort_order: 70, icon: 'users' },
      { name: 'parent_analytics', display_name: 'ANALYTICS & REPORTS', sort_order: 80, icon: 'bar-chart' },
      { name: 'parent_admin', display_name: 'ADMINISTRATION', sort_order: 90, icon: 'settings' }
    ];

    const parentIds = {};
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = roleRes.rows[0].id;

    for (const p of parents) {
      let res = await client.query('SELECT id FROM sidebar_modules WHERE name = $1', [p.name]);
      if (res.rows.length === 0) {
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO sidebar_modules (id, name, display_name, sort_order, icon_id, is_active) VALUES ($1, $2, $3, $4, $5, true)`,
          [id, p.name, p.display_name, p.sort_order, p.icon]
        );
        
        await client.query(
          "INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible) VALUES ($1, $2, true) ON CONFLICT DO NOTHING",
          [adminRoleId, id]
        );
        parentIds[p.name] = id;
      } else {
        parentIds[p.name] = res.rows[0].id;
        await client.query(
          `UPDATE sidebar_modules SET display_name = $1, sort_order = $2, parent_id = NULL, is_active = true WHERE id = $3`,
          [p.display_name, p.sort_order, parentIds[p.name]]
        );
        await client.query(
          "INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible) VALUES ($1, $2, true) ON CONFLICT DO NOTHING",
          [adminRoleId, parentIds[p.name]]
        );
      }
    }

    // Ensure Dashboard parent exists as the very first
    let dashboardId;
    let dashRes = await client.query("SELECT id FROM sidebar_modules WHERE name = 'dashboard_parent'");
    if (dashRes.rows.length === 0) {
      dashboardId = crypto.randomUUID();
      await client.query(
        `INSERT INTO sidebar_modules (id, name, display_name, sort_order, route, icon_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [dashboardId, 'dashboard_parent', 'Dashboard', 5, '/dashboard', 'dashboard']
      );
    } else {
      dashboardId = dashRes.rows[0].id;
      await client.query(
        `UPDATE sidebar_modules SET display_name = 'Dashboard', sort_order = 5, parent_id = NULL, route = '/dashboard', icon_id = 'dashboard', is_active = true WHERE id = $1`,
        [dashboardId]
      );
    }
    await client.query(
      "INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible) VALUES ($1, $2, true) ON CONFLICT DO NOTHING",
      [adminRoleId, dashboardId]
    );

    const children = [
      // 1. BUSINESS DEVELOPMENT (BDM)
      { name: 'client_pipeline', display_name: 'Client Pipeline', route: '/bdm/pipeline', parent: 'parent_bdm', sort: 1 },
      { name: 'clients', display_name: 'Clients', route: '/clients', parent: 'parent_bdm', sort: 2 },
      { name: 'requirements', display_name: 'Requirements', route: '/client-manager/requirements', parent: 'parent_bdm', sort: 3 },
      { name: 'bdm_requirements', display_name: 'BDM Requirements', route: '/bdm/requirements', parent: 'parent_bdm', sort: 4 },
      { name: 'requirement_approval', display_name: 'Requirement Approval', route: '/jobs/oversight', parent: 'parent_bdm', sort: 5 },
      { name: 'client_submission_tracking', display_name: 'Client Submission Tracking', route: '/client-manager/submissions', parent: 'parent_bdm', sort: 6 },
      
      // 2. RECRUITMENT PLANNING (MANAGER)
      { name: 'jobs', display_name: 'Jobs', route: '/jobs', parent: 'parent_manager', sort: 1 },
      { name: 'team_lead_assignment', display_name: 'Team Lead Assignment', route: '/jobs/oversight?tab=team-lead', parent: 'parent_manager', sort: 2 },
      { name: 'recruiter_assignment', display_name: 'Recruiter Assignment', route: '/jobs/oversight?tab=recruiter', parent: 'parent_manager', sort: 3 },
      { name: 'my_assignments', display_name: 'My Assignments', route: '/jobs/my-assignments', parent: 'parent_manager', sort: 4 },
      { name: 'req_approval_manager', display_name: 'Requirement Approval', route: '/jobs/oversight', parent: 'parent_manager', sort: 5 },
      { name: 'team_requirements', display_name: 'Team Requirements', route: '/team-lead/requirements', parent: 'parent_manager', sort: 6 },
      { name: 'job_approval', display_name: 'Job Approval', route: '/jobs/oversight', parent: 'parent_manager', sort: 7 },

      // 3. TEAM LEAD MANAGEMENT
      { name: 'assigned_jobs', display_name: 'Assigned Jobs', route: '/team-lead/requirements', parent: 'parent_team_lead', sort: 1 },
      { name: 'recruiter_assignment_tl', display_name: 'Recruiter Assignment', route: '/jobs/oversight?tab=recruiter', parent: 'parent_team_lead', sort: 2 },
      { name: 'recruiter_performance', display_name: 'Recruiter Performance', route: '/team-lead/team-kpis', parent: 'parent_team_lead', sort: 3 },
      { name: 'shortlist_review', display_name: 'Shortlist Review', route: '/submissions/review', parent: 'parent_team_lead', sort: 4 },
      { name: 'submission_review', display_name: 'Submission Review', route: '/submissions/review', parent: 'parent_team_lead', sort: 5 },
      { name: 'team_dashboard', display_name: 'Team Dashboard', route: '/team-lead/team-dashboard', parent: 'parent_team_lead', sort: 6 },

      // 4. CANDIDATE SOURCING (RECRUITER)
      { name: 'boolean_search', display_name: 'Boolean Search', route: '/candidates/boolean-search', parent: 'parent_recruiter', sort: 1 },
      { name: 'xray_search', display_name: 'X-Ray Search', route: '/candidates/xray-search', parent: 'parent_recruiter', sort: 2 },
      { name: 'upload_resume', display_name: 'Upload Resume', route: '/upload', parent: 'parent_recruiter', sort: 3 },
      { name: 'resume_parsing', display_name: 'Resume Parsing', route: '/upload?tab=parsing', parent: 'parent_recruiter', sort: 4 },
      { name: 'candidates', display_name: 'Candidates', route: '/candidates', parent: 'parent_recruiter', sort: 5 },
      { name: 'duplicate_candidates', display_name: 'Duplicate Candidates', route: '/candidates/duplicates', parent: 'parent_recruiter', sort: 6 },

      // 5. AI RECRUITMENT
      { name: 'jd_matching', display_name: 'JD Matching', route: '/jd-matching', parent: 'parent_ai', sort: 1 },
      { name: 'ai_matching', display_name: 'AI Matching', route: '/matching', parent: 'parent_ai', sort: 2 },
      { name: 'resume_labeling', display_name: 'Resume Labeling', route: '/labeling', parent: 'parent_ai', sort: 3 },
      { name: 'model_test', display_name: 'Model Test', route: '/model-test', parent: 'parent_ai', sort: 4 },
      { name: 'section_preview', display_name: 'Section Preview', route: '/section-preview', parent: 'parent_ai', sort: 5 },
      { name: 'accuracy', display_name: 'Model Accuracy', route: '/accuracy', parent: 'parent_ai', sort: 6 },
      { name: 'parser_analytics', display_name: 'Parser Analytics', route: '/analytics?tab=parser', parent: 'parent_ai', sort: 7 },
      { name: 'ai_analytics', display_name: 'AI Analytics', route: '/analytics?tab=ai', parent: 'parent_ai', sort: 8 },

      // 6. HIRING PROCESS (END TO END)
      { name: 'shortlisted_candidates', display_name: 'Shortlisted Candidates', route: '/submissions/review?tab=shortlisted', parent: 'parent_hiring', sort: 1 },
      { name: 'submissions', display_name: 'Submissions', route: '/submissions', parent: 'parent_hiring', sort: 2 },
      { name: 'client_review', display_name: 'Client Review', route: '/client-manager/submissions', parent: 'parent_hiring', sort: 3 },
      { name: 'interviews', display_name: 'Interviews', route: '/interviews', parent: 'parent_hiring', sort: 4 },
      { name: 'offer', display_name: 'Offer', route: '/interviews?tab=offer', parent: 'parent_hiring', sort: 5 },
      { name: 'joining', display_name: 'Joining', route: '/interviews?tab=joining', parent: 'parent_hiring', sort: 6 },
      { name: 'placement', display_name: 'Placement', route: '/interviews?tab=placement', parent: 'parent_hiring', sort: 7 },

      // 7. TEAM MANAGEMENT
      { name: 'users', display_name: 'Users', route: '/users', parent: 'parent_team_management', sort: 1 },
      { name: 'roles_permissions', display_name: 'Roles & Permissions', route: '/settings/permissions', parent: 'parent_team_management', sort: 2 },
      { name: 'team_kpis', display_name: 'Team KPIs', route: '/team-lead/team-kpis', parent: 'parent_team_management', sort: 3 },
      { name: 'submission_review_queue', display_name: 'Submission Review Queue', route: '/submissions/review', parent: 'parent_team_management', sort: 4 },
      { name: 'activity_timeline_tm', display_name: 'Activity Timeline', route: '/settings/audit-logs', parent: 'parent_team_management', sort: 5 },
      { name: 'departments', display_name: 'Departments', route: '/settings/departments', parent: 'parent_team_management', sort: 6 },
      { name: 'teams', display_name: 'Teams', route: '/settings/teams', parent: 'parent_team_management', sort: 7 },

      // 8. ANALYTICS & REPORTS
      { name: 'recruitment_analytics', display_name: 'Recruitment Analytics', route: '/analytics?tab=recruitment', parent: 'parent_analytics', sort: 1 },
      { name: 'parser_analytics_rep', display_name: 'Parser Analytics', route: '/analytics?tab=parser', parent: 'parent_analytics', sort: 2 },
      { name: 'ai_analytics_rep', display_name: 'AI Analytics', route: '/analytics?tab=ai', parent: 'parent_analytics', sort: 3 },
      { name: 'company_analytics', display_name: 'Company Analytics', route: '/company-intel', parent: 'parent_analytics', sort: 4 },
      { name: 'reports', display_name: 'Reports', route: '/bdm/reports', parent: 'parent_analytics', sort: 5 },
      { name: 'audit_logs', display_name: 'Audit Logs', route: '/settings/audit-logs', parent: 'parent_analytics', sort: 6 },

      // 9. ADMINISTRATION
      { name: 'notifications', display_name: 'Notifications', route: '/settings/notifications', parent: 'parent_admin', sort: 1 },
      { name: 'settings', display_name: 'Settings', route: '/settings', parent: 'parent_admin', sort: 2 },
      { name: 'system_configuration', display_name: 'System Configuration', route: '/settings/system', parent: 'parent_admin', sort: 3 },
      { name: 'integrations', display_name: 'Integrations', route: '/settings/integrations', parent: 'parent_admin', sort: 4 },
      { name: 'activity_logs', display_name: 'Activity Logs', route: '/settings/audit-logs', parent: 'parent_admin', sort: 5 },
      { name: 'backup_restore', display_name: 'Backup & Restore', route: '/settings/backup', parent: 'parent_admin', sort: 6 }
    ];

    for (const c of children) {
      let res = await client.query('SELECT id FROM sidebar_modules WHERE name = $1', [c.name]);
      const parentId = parentIds[c.parent];
      
      let childId;
      if (res.rows.length === 0) {
        childId = crypto.randomUUID();
        await client.query(
          `INSERT INTO sidebar_modules (id, name, display_name, sort_order, route, parent_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [childId, c.name, c.display_name, c.sort, c.route, parentId]
        );
      } else {
        childId = res.rows[0].id;
        await client.query(
          `UPDATE sidebar_modules SET display_name = $1, sort_order = $2, route = $3, parent_id = $4, is_active = true WHERE id = $5`,
          [c.display_name, c.sort, c.route, parentId, childId]
        );
      }

      await client.query(
        "INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id, visible) VALUES ($1, $2, true) ON CONFLICT DO NOTHING",
        [adminRoleId, childId]
      );
    }

    await client.query('COMMIT');
    console.log('Sidebar successfully updated to match the Enterprise ATS Dashboard requested structure.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update modules', error);
  } finally {
    client.release();
    pool.end();
  }
}

main();
