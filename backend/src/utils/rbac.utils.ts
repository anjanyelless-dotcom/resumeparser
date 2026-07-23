// Modular scope handlers mapping modules to their scoping functions
const moduleScopeHandlers: Record<string, (perms: string[], user: any, aliasPrefix: string) => { sql: string, params: any[] } | null> = {
  clients: (perms, user, aliasPrefix) => {
    if (perms.includes(`clients:view_own`)) return { sql: ` AND ${aliasPrefix}owner_user_id = $PARAM`, params: [user.id] };
    return null;
  },
  analytics: (perms, user, aliasPrefix) => {
    if (perms.includes(`analytics:view_own_clients`) || perms.includes(`clients:view_own`)) return { sql: ` AND ${aliasPrefix}owner_user_id = $PARAM`, params: [user.id] };
    if (perms.includes(`analytics:view_team`) || perms.includes(`team_kpis:view`)) return { sql: ` AND ${aliasPrefix}team_lead_id = $PARAM`, params: [user.id] };
    return null;
  },
  jobs: (perms, user, aliasPrefix) => {
    if (perms.includes(`jobs:view_own_client`)) return { sql: ` AND ${aliasPrefix}client_id IN (SELECT id FROM clients WHERE owner_user_id = $PARAM)`, params: [user.id] };
    return null;
  },
  users: (perms, user, aliasPrefix) => {
    if (perms.includes(`users:view_team`)) return { sql: ` AND ${aliasPrefix}team_lead_id = $PARAM`, params: [user.id] };
    return null;
  },
  submissions: (perms, user, aliasPrefix) => {
    if (perms.includes(`submissions:view_team`)) return { sql: ` AND ${aliasPrefix}team_lead_id = $PARAM`, params: [user.id] };
    return null;
  },
  team_requirements: (perms, user, aliasPrefix) => {
    if (perms.includes(`team_requirements:view`)) return { sql: ` AND ${aliasPrefix}team_lead_id = $PARAM`, params: [user.id] };
    return null;
  },
  team_kpis: (perms, user, aliasPrefix) => {
    if (perms.includes(`team_kpis:view`)) return { sql: ` AND ${aliasPrefix}team_lead_id = $PARAM`, params: [user.id] };
    return null;
  },
  dashboard: (perms, user, aliasPrefix) => {
    if (perms.includes(`dashboard:view_team_lead`)) return { sql: ` AND ${aliasPrefix}team_lead_id = $PARAM`, params: [user.id] };
    return null;
  }
};

export const buildScopeFilter = (user: any, moduleName: string, tableAlias: string) => {
  const perms = user?.permissions || [];
  const aliasPrefix = tableAlias ? `${tableAlias}.` : '';
  
  // ALL Scope (No filter applied)
  if (perms.includes(`${moduleName}:view`) || perms.includes(`${moduleName}:view_all`)) {
    return { sql: '', params: [] };
  }

  // Use modular scope handler if defined for the module
  const handler = moduleScopeHandlers[moduleName];
  if (handler) {
    const scope = handler(perms, user, aliasPrefix);
    if (scope) return scope;
  }

  // Fallback to strict deny if no matching scope found for the user's permissions
  return { sql: ` AND 1 = 0`, params: [] }; 
};
