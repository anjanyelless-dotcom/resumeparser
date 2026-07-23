/**
 * Role constants for the application
 * This file ensures consistency across all role validation logic
 */

export const VALID_ROLES = [
  'admin',
  'recruiter', 
  'viewer',
  'candidate',
  'bdm',
  'team_lead',
  'client_manager'
] as const;

export type UserRole = typeof VALID_ROLES[number];

export const ROLE_HIERARCHY = {
  admin: 100,
  client_manager: 80,
  team_lead: 70,
  bdm: 60,
  recruiter: 50,
  candidate: 30,
  viewer: 20
} as const;

export const ROLE_PERMISSIONS = {
  admin: ['*'], // All permissions
  client_manager: [
    'communications', 'clients', 'dashboard', 'submissions', 
    'interviews', 'upload', 'matching', 'labeling', 'analytics', 'settings'
  ],
  team_lead: [
    'jobs', 'candidates', 'dashboard', 'requirements', 
    'interviews', 'upload', 'matching', 'labeling', 'analytics', 'settings'
  ],
  bdm: [
    'jobs', 'candidates', 'dashboard', 'requirements', 
    'clients', 'reports', 'settings'
  ],
  recruiter: [
    'jobs', 'candidates', 'dashboard', 'requirements', 
    'interviews', 'upload', 'matching', 'labeling', 'analytics', 'settings'
  ],
  candidate: [
    'apply', 'profile', 'resume_upload', 'application_submission'
  ],
  viewer: [
    'dashboard', 'jobs', 'candidates', 'analytics'
  ]
} as const;

export const isValidRole = (role: string): role is UserRole => {
  return VALID_ROLES.includes(role as UserRole);
};

export const getDefaultRole = (): UserRole => 'recruiter';

export const getCandidateRole = (): UserRole => 'candidate';

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole] as readonly string[];
  return permissions.includes('*') || permissions.includes(permission);
};

export const canAccessModule = (userRole: UserRole, module: string): boolean => {
  return hasPermission(userRole, module);
};
