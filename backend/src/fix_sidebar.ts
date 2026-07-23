import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'resume_parser',
  password: 'Surya@123',
  port: 5432,
});

const modules = [
  // ─── Top Level / Single items ───
  { id: 'dashboard', name: 'dashboard', display_name: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard', sort_order: 1, is_parent: false, parent_id: null },
  { id: 'my_assignment', name: 'my_assignment', display_name: 'My Assignment', icon: 'Briefcase', route: '/jobs/my-assignments', sort_order: 2, is_parent: false, parent_id: null },

  // ─── Parents ───
  { id: 'parent_bdm', name: 'parent_bdm', display_name: 'Business Development', icon: 'FolderKanban', route: '/business-development', sort_order: 3, is_parent: true, parent_id: null },
  { id: 'parent_manager', name: 'parent_manager', display_name: 'Recruitment Planning', icon: 'Briefcase', route: '/recruitment-planning', sort_order: 4, is_parent: true, parent_id: null },
  { id: 'parent_team_lead', name: 'parent_team_lead', display_name: 'Team Lead Management', icon: 'UserCheck', route: '/team-lead-management', sort_order: 5, is_parent: true, parent_id: null },
  { id: 'parent_recruiter', name: 'parent_recruiter', display_name: 'Candidate Sourcing', icon: 'Users', route: '/candidate-sourcing', sort_order: 6, is_parent: true, parent_id: null },
  { id: 'parent_ai', name: 'parent_ai', display_name: 'AI Recruitment', icon: 'Sparkles', route: '/ai-recruitment', sort_order: 7, is_parent: true, parent_id: null },
  { id: 'parent_hiring', name: 'parent_hiring', display_name: 'Hiring Process', icon: 'Target', route: '/hiring-process', sort_order: 8, is_parent: true, parent_id: null },
  { id: 'parent_analytics', name: 'parent_analytics', display_name: 'Analytics & Reports', icon: 'BarChart3', route: '/analytics-reports', sort_order: 9, is_parent: true, parent_id: null },
  { id: 'parent_admin', name: 'parent_admin', display_name: 'Settings', icon: 'Settings', route: '/settings', sort_order: 10, is_parent: true, parent_id: null },

  // ─── Children of Business Development ───
  { id: 'client_pipeline', name: 'client_pipeline', display_name: 'Client Pipeline', route: '/business-development/client-pipeline', sort_order: 1, is_parent: false, parent_id: 'parent_bdm' },
  { id: 'clients', name: 'clients', display_name: 'Clients', route: '/business-development/clients', sort_order: 2, is_parent: false, parent_id: 'parent_bdm' },
  { id: 'bdm_requirements', name: 'bdm_requirements', display_name: 'BDM Requirements', route: '/business-development/bdm-requirements', sort_order: 3, is_parent: false, parent_id: 'parent_bdm' },
  { id: 'requirement_approval', name: 'requirement_approval', display_name: 'Requirement Approval', route: '/business-development/requirement-approval', sort_order: 4, is_parent: false, parent_id: 'parent_bdm' },
  { id: 'client_submission_tracking', name: 'client_submission_tracking', display_name: 'Client Submission Tracking', route: '/business-development/client-submission-tracking', sort_order: 5, is_parent: false, parent_id: 'parent_bdm' },

  // ─── Children of Recruitment Planning ───
  { id: 'jobs', name: 'jobs', display_name: 'Jobs', route: '/recruitment-planning/jobs', sort_order: 1, is_parent: false, parent_id: 'parent_manager' },
  { id: 'team_lead_assignment', name: 'team_lead_assignment', display_name: 'Team Lead Assignment', route: '/recruitment-planning/team-lead-assignment', sort_order: 2, is_parent: false, parent_id: 'parent_manager' },
  { id: 'recruiter_assignment', name: 'recruiter_assignment', display_name: 'Recruiter Assignment', route: '/recruitment-planning/recruiter-assignment', sort_order: 3, is_parent: false, parent_id: 'parent_manager' },
  { id: 'req_approval_manager', name: 'req_approval_manager', display_name: 'Requirement Approval', route: '/recruitment-planning/requirement-approval', sort_order: 4, is_parent: false, parent_id: 'parent_manager' },

  // ─── Children of Team Lead Management ───
  { id: 'assigned_jobs', name: 'assigned_jobs', display_name: 'Assigned Jobs', route: '/team-lead-management/assigned-jobs', sort_order: 1, is_parent: false, parent_id: 'parent_team_lead' },
  { id: 'recruiter_assignment_tl', name: 'recruiter_assignment_tl', display_name: 'Recruiter Assignment', route: '/team-lead-management/recruiter-assignment', sort_order: 2, is_parent: false, parent_id: 'parent_team_lead' },
  { id: 'shortlist_review', name: 'shortlist_review', display_name: 'Shortlist Review', route: '/team-lead-management/shortlist-review', sort_order: 3, is_parent: false, parent_id: 'parent_team_lead' },
  { id: 'submission_review', name: 'submission_review', display_name: 'Submission Review', route: '/team-lead-management/submission-review', sort_order: 4, is_parent: false, parent_id: 'parent_team_lead' },
  { id: 'team_dashboard', name: 'team_dashboard', display_name: 'Team Dashboard', route: '/team-lead-management/team-dashboard', sort_order: 5, is_parent: false, parent_id: 'parent_team_lead' },

  // ─── Children of Candidate Sourcing ───
  { id: 'boolean_search', name: 'boolean_search', display_name: 'Boolean Search', route: '/candidate-sourcing/boolean-search', sort_order: 1, is_parent: false, parent_id: 'parent_recruiter' },
  { id: 'x_ray_search', name: 'x_ray_search', display_name: 'X-Ray Search', route: '/candidate-sourcing/x-ray-search', sort_order: 2, is_parent: false, parent_id: 'parent_recruiter' },
  { id: 'upload_resume', name: 'upload_resume', display_name: 'Upload Resume', route: '/candidate-sourcing/upload-resume', sort_order: 3, is_parent: false, parent_id: 'parent_recruiter' },
  { id: 'resume_parsing', name: 'resume_parsing', display_name: 'Resume Parsing', route: '/candidate-sourcing/resume-parsing', sort_order: 4, is_parent: false, parent_id: 'parent_recruiter' },
  { id: 'candidates', name: 'candidates', display_name: 'Candidates', route: '/candidate-sourcing/candidates', sort_order: 5, is_parent: false, parent_id: 'parent_recruiter' },
  { id: 'duplicate_candidates', name: 'duplicate_candidates', display_name: 'Duplicate Candidates', route: '/candidate-sourcing/duplicate-candidates', sort_order: 6, is_parent: false, parent_id: 'parent_recruiter' },

  // ─── Children of AI Recruitment ───
  { id: 'jd_matching', name: 'jd_matching', display_name: 'JD Matching', route: '/ai-recruitment/jd-matching', sort_order: 1, is_parent: false, parent_id: 'parent_ai' },
  { id: 'ai_matching', name: 'ai_matching', display_name: 'AI Matching', route: '/ai-recruitment/ai-matching', sort_order: 2, is_parent: false, parent_id: 'parent_ai' },
  { id: 'resume_labeling', name: 'resume_labeling', display_name: 'Resume Labeling', route: '/ai-recruitment/resume-labeling', sort_order: 3, is_parent: false, parent_id: 'parent_ai' },
  { id: 'model_test', name: 'model_test', display_name: 'Model Test', route: '/ai-recruitment/model-test', sort_order: 4, is_parent: false, parent_id: 'parent_ai' },
  { id: 'section_preview', name: 'section_preview', display_name: 'Section Preview', route: '/ai-recruitment/section-preview', sort_order: 5, is_parent: false, parent_id: 'parent_ai' },
  { id: 'model_accuracy', name: 'model_accuracy', display_name: 'Model Accuracy', route: '/ai-recruitment/model-accuracy', sort_order: 6, is_parent: false, parent_id: 'parent_ai' },

  // ─── Children of Hiring Process ───
  { id: 'shortlisted_candidates', name: 'shortlisted_candidates', display_name: 'Shortlisted Candidates', route: '/hiring-process/shortlisted-candidates', sort_order: 1, is_parent: false, parent_id: 'parent_hiring' },
  { id: 'submissions', name: 'submissions', display_name: 'Submissions', route: '/hiring-process/submissions', sort_order: 2, is_parent: false, parent_id: 'parent_hiring' },
  { id: 'client_review', name: 'client_review', display_name: 'Client Review', route: '/hiring-process/client-review', sort_order: 3, is_parent: false, parent_id: 'parent_hiring' },
  { id: 'interviews', name: 'interviews', display_name: 'Interviews', route: '/hiring-process/interviews', sort_order: 4, is_parent: false, parent_id: 'parent_hiring' },
  { id: 'offer_management', name: 'offer_management', display_name: 'Offer Management', route: '/hiring-process/offer-management', sort_order: 5, is_parent: false, parent_id: 'parent_hiring' },
  { id: 'joining', name: 'joining', display_name: 'Joining', route: '/hiring-process/joining', sort_order: 6, is_parent: false, parent_id: 'parent_hiring' },
  { id: 'placement', name: 'placement', display_name: 'Placement', route: '/hiring-process/placement', sort_order: 7, is_parent: false, parent_id: 'parent_hiring' },

  // ─── Children of Analytics & Reports ───
  { id: 'recruitment_analytics', name: 'recruitment_analytics', display_name: 'Recruitment Analytics', route: '/analytics-reports/recruitment-analytics', sort_order: 1, is_parent: false, parent_id: 'parent_analytics' },
  { id: 'parser_analytics', name: 'parser_analytics', display_name: 'Parser Analytics', route: '/analytics-reports/parser-analytics', sort_order: 2, is_parent: false, parent_id: 'parent_analytics' },
  { id: 'ai_analytics', name: 'ai_analytics', display_name: 'AI Analytics', route: '/analytics-reports/ai-analytics', sort_order: 3, is_parent: false, parent_id: 'parent_analytics' },
  { id: 'company_analytics', name: 'company_analytics', display_name: 'Company Analytics', route: '/analytics-reports/company-analytics', sort_order: 4, is_parent: false, parent_id: 'parent_analytics' },
  { id: 'reports', name: 'reports', display_name: 'Reports', route: '/analytics-reports/reports', sort_order: 5, is_parent: false, parent_id: 'parent_analytics' },
  { id: 'audit_logs_analytics', name: 'audit_logs_analytics', display_name: 'Audit Logs', route: '/analytics-reports/audit-logs', sort_order: 6, is_parent: false, parent_id: 'parent_analytics' },

  // ─── Children of Settings ───
  { id: 'general', name: 'general', display_name: 'General', route: '/settings/general', sort_order: 1, is_parent: false, parent_id: 'parent_admin' },
  { id: 'labeling', name: 'labeling', display_name: 'Labeling', route: '/settings/labeling', sort_order: 2, is_parent: false, parent_id: 'parent_admin' },
  { id: 'permissions', name: 'permissions', display_name: 'Permissions', route: '/settings/permissions', sort_order: 3, is_parent: false, parent_id: 'parent_admin' },
  { id: 'pipeline_stages', name: 'pipeline_stages', display_name: 'Pipeline Stages', route: '/settings/pipeline-stages', sort_order: 4, is_parent: false, parent_id: 'parent_admin' },
  { id: 'email_templates', name: 'email_templates', display_name: 'Email Templates', route: '/settings/email-templates', sort_order: 5, is_parent: false, parent_id: 'parent_admin' },
  { id: 'notifications', name: 'notifications', display_name: 'Notifications', route: '/settings/notifications', sort_order: 6, is_parent: false, parent_id: 'parent_admin' },
  { id: 'users', name: 'users', display_name: 'Users', route: '/settings/users', sort_order: 7, is_parent: false, parent_id: 'parent_admin' },
  { id: 'audit_logs_settings', name: 'audit_logs_settings', display_name: 'Audit Logs', route: '/settings/audit-logs', sort_order: 8, is_parent: false, parent_id: 'parent_admin' },
  { id: 'duplicates', name: 'duplicates', display_name: 'Duplicates', route: '/settings/duplicates', sort_order: 9, is_parent: false, parent_id: 'parent_admin' }
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, let's keep track of existing permissions so we can restore them for the Admin role if needed
    // Actually, let's just wipe and recreate the exact set of sidebar_modules.
    // We will drop all foreign keys or cascade delete.
    
    await client.query('DELETE FROM role_sidebar_permissions');
    await client.query('DELETE FROM sidebar_modules');
    
    console.log('Deleted old sidebar modules.');
    
    // Map string IDs to UUIDs
    const idMap: Record<string, string> = {};
    for (const mod of modules) {
      idMap[mod.id] = uuidv4();
    }

    for (const mod of modules) {
      const realId = idMap[mod.id];
      const realParentId = mod.parent_id ? idMap[mod.parent_id] : null;
      await client.query(`
        INSERT INTO sidebar_modules (id, name, display_name, icon, route, sort_order, parent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [realId, mod.name, mod.display_name, mod.icon || null, mod.route || null, mod.sort_order, realParentId]);
    }
    
    console.log('Inserted new sidebar modules.');
    
    // Now give all permissions to Admin role
    const adminRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`);
    if (adminRoleRes.rows.length > 0) {
      const adminRoleId = adminRoleRes.rows[0].id;
      for (const mod of modules) {
        const realId = idMap[mod.id];
        await client.query(`
          INSERT INTO role_sidebar_permissions (role_id, sidebar_module_id)
          VALUES ($1, $2)
        `, [adminRoleId, realId]);
      }
      console.log('Granted all permissions to Admin role.');
    }
    
    await client.query('COMMIT');
    console.log('Successfully updated sidebar hierarchy.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
