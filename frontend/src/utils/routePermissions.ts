export interface RoutePermission {
  module: string;
  action: string;
}

export const routePermissions: Record<string, RoutePermission> = {
  // Common
  
  // Recruitment
  '/upload': { module: 'upload_resume', action: 'view' },
  '/candidates': { module: 'candidates', action: 'view' },
  '/candidates/filter-search': { module: 'candidates', action: 'view' },
  '/candidates/xray-search': { module: 'xray_search', action: 'view' },
  '/candidates/boolean-search': { module: 'boolean_search', action: 'view' },
  '/candidates/:id': { module: 'candidates', action: 'view' },
  
  // Jobs
  '/jobs': { module: 'jobs', action: 'view' },
  '/jobs/my-assignments': { module: 'my_assignments', action: 'view' },
  '/jobs/:id': { module: 'jobs', action: 'view' },
  
  // Matching & AI Tools
  '/matching': { module: 'ai_matching', action: 'view' },
  '/jd-matching': { module: 'jd_matching', action: 'view' },
  '/section-preview': { module: 'section_preview', action: 'view' },
  '/model-test': { module: 'model_test', action: 'view' },
  
  // Analytics & Reports
  '/analytics': { module: 'analytics', action: 'view' },
  '/accuracy': { module: 'accuracy', action: 'view' },
  
  // Resume Intelligence
  '/parsing': { module: 'upload_resume', action: 'view' },
  '/labeling': { module: 'upload_resume', action: 'view' },
  
  // Interviews
  '/interviews': { module: 'interviews', action: 'view' },
  
  // Settings & Admin
  '/users': { module: 'users', action: 'view' },
  '/users/create': { module: 'users', action: 'create' },
  '/users/:id/edit': { module: 'users', action: 'edit' },
  '/roles': { module: 'users', action: 'view' },
  '/settings': { module: 'settings', action: 'view' },
  '/settings/audit-logs': { module: 'settings', action: 'view' },
  '/settings/notifications': { module: 'settings', action: 'view' },

  
  // Clients (Shared) - Permission checked at API level; do not block at route level
  // '/clients': { module: 'clients', action: 'view' },
  // '/clients/:id': { module: 'clients', action: 'view' },
  
  // Recruiter
  '/recruiter/requirements': { module: 'requirements', action: 'view' },
  '/recruiter/candidates': { module: 'candidates', action: 'view' },
  '/recruiter/submissions': { module: 'submissions', action: 'view' },
  
  // Team Lead
  '/team-lead/dashboard': { module: 'dashboard_parent', action: 'view' },
  '/team-lead/requirements': { module: 'requirements', action: 'view' },
  '/team-lead/review-queue': { module: 'submissions', action: 'view' },
  
  // Client Manager
  '/client-manager/dashboard': { module: 'dashboard_parent', action: 'view' },
  '/client-manager/requirements': { module: 'requirements', action: 'view' },
  '/client-manager/submissions': { module: 'submissions', action: 'view' },
  '/client-manager/interviews': { module: 'interviews', action: 'view' },
  
  // BDM
  '/bdm/dashboard': { module: 'dashboard_parent', action: 'view' },
  '/bdm/pipeline': { module: 'client_pipeline', action: 'view' },
  '/bdm/clients/:id': { module: 'clients', action: 'view' },
  '/bdm/requirements': { module: 'requirements', action: 'view' },
  '/bdm/requirements/new': { module: 'requirements', action: 'create' },
  '/bdm/requirements/:id': { module: 'requirements', action: 'edit' },
  '/bdm/candidates': { module: 'candidates', action: 'view' },
  '/bdm/reports': { module: 'analytics', action: 'view' },
  '/bdm/submissions': { module: 'submissions', action: 'view' },
  '/bdm/submissions/:jobId': { module: 'submissions', action: 'view' },
  
  // Admin aliases
  '/admin/jobs': { module: 'jobs', action: 'view' },
  '/admin/audit-logs': { module: 'settings', action: 'view' },
  '/admin/duplicates': { module: 'candidates', action: 'view' },
  '/admin/permissions': { module: 'users', action: 'view' },
  
  // Shared Submissions
  '/submissions/:id': { module: 'submissions', action: 'view' },
  
  // Company Intel
  '/company-intel': { module: 'clients', action: 'view' },

  // New pages
  '/placements':              { module: 'submissions', action: 'view' },
  '/teams':                   { module: 'users', action: 'view' },
  '/departments':             { module: 'jobs', action: 'view' },
  '/integrations':            { module: 'settings', action: 'view' },
  '/backup-restore':          { module: 'settings', action: 'view' },
  '/audit-logs':              { module: 'settings', action: 'view' },
  '/activity-logs':           { module: 'settings', action: 'view' },
  '/activity-timeline':       { module: 'settings', action: 'view' },
  '/notifications':           { module: 'settings', action: 'view' },
  '/system-settings':         { module: 'settings', action: 'view' },
  '/reports':                 { module: 'analytics', action: 'view' },
  '/job-oversight':           { module: 'jobs', action: 'view' },
  '/recruiter-performance':   { module: 'team_kpis', action: 'view' },
  '/team-lead/team-dashboard':{ module: 'dashboard_parent', action: 'view' },
  '/team-lead/shortlist-review': { module: 'submissions', action: 'view' },
  '/team-lead/team-kpis':     { module: 'team_kpis', action: 'view' },
  
  // New dedicated pages
  '/requirement-approval':    { module: 'jobs', action: 'view' },
  '/offers':                  { module: 'submissions', action: 'view' },
  '/joining':                 { module: 'submissions', action: 'view' },
  
  // Missing candidate sub-routes
  '/candidates/duplicates':   { module: 'candidates', action: 'view' },
};

export function getRequiredPermission(pathname: string): RoutePermission | null {
  // Direct exact match
  if (routePermissions[pathname]) {
    return routePermissions[pathname];
  }

  // Dynamic route match (e.g. /users/:id/edit)
  const paths = Object.keys(routePermissions);
  for (const path of paths) {
    if (path.includes(':')) {
      const regexStr = path.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(pathname)) {
        return routePermissions[path];
      }
    }
  }

  // No specific permission mapped
  return null;
}
