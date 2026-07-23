export const formatRoleName = (roleName: string) => {
  if (!roleName) return '';
  const roleMap: Record<string, string> = {
    'admin': 'Admin',
    'manager': 'Manager',
    'recruiter': 'Recruiter',
    'bdm': 'Business Development Manager',
    'candidate': 'Candidate',
    'client': 'Client',
    'client_manager': 'Client Manager',
    'hr': 'HR',
    'team_lead': 'Team Lead',
    'viewer': 'Viewer'
  };
  return roleMap[roleName.toLowerCase()] || roleName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const filterInternalRoles = (roles: any[]) => {
  const excludedRoles = ['candidate', 'client', 'client_manager', 'hr', 'viewer'];
  return roles.filter(role => {
    const roleName = (role.name || role).toString().toLowerCase();
    return !excludedRoles.includes(roleName);
  });
};

