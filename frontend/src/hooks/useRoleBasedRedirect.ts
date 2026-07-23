import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface RoleBasedRedirectConfig {
  [key: string]: {
    allowedPaths: string[];
    defaultPath: string;
    restrictedPaths: string[];
  };
}

const roleConfig: RoleBasedRedirectConfig = {
  candidate: {
    allowedPaths: ['/apply', '/apply/*', '/profile', '/'],
    defaultPath: '/apply',
    restrictedPaths: [
      '/dashboard',
      '/candidates',
      '/candidates/*',
      '/jobs',
      '/jobs/*',
      '/upload',
      '/interviews',
      '/submissions',
      '/analytics',
      '/settings',
      '/admin',
      '/recruiter'
    ]
  },
  admin: {
    allowedPaths: ['/*'], // Admin can access everything
    defaultPath: '/dashboard',
    restrictedPaths: []
  },
  super_admin: {
    allowedPaths: ['/*'], // Super Admin can access everything
    defaultPath: '/dashboard',
    restrictedPaths: []
  },
  manager: {
    allowedPaths: ['/*'], // Manager can access everything for now
    defaultPath: '/dashboard',
    restrictedPaths: ['/settings', '/admin']
  },
  recruiter: {
    allowedPaths: [
      '/dashboard',
      '/candidates',
      '/candidates/*',
      '/jobs',
      '/jobs/*',
      '/upload',
      '/interviews',
      '/submissions',
      '/analytics',
      '/recruiter/*',
      '/'
    ],
    defaultPath: '/dashboard',
    restrictedPaths: ['/admin', '/settings']
  },
  team_lead: {
    allowedPaths: [
      '/dashboard',
      '/candidates',
      '/candidates/*',
      '/jobs',
      '/jobs/*',
      '/upload',
      '/interviews',
      '/submissions',
      '/analytics',
      '/recruiter/*',
      '/'
    ],
    defaultPath: '/dashboard',
    restrictedPaths: ['/admin', '/settings']
  },
  client_manager: {
    allowedPaths: ['/clients', '/jobs', '/analytics', '/'],
    defaultPath: '/clients',
    restrictedPaths: ['/dashboard', '/candidates', '/upload', '/admin', '/settings']
  },
  bdm: {
    allowedPaths: ['/clients', '/jobs', '/analytics', '/bdm', '/'],
    defaultPath: '/clients',
    restrictedPaths: ['/dashboard', '/candidates', '/upload', '/admin', '/settings']
  },
  viewer: {
    allowedPaths: ['/dashboard', '/candidates', '/jobs', '/analytics', '/'],
    defaultPath: '/dashboard',
    restrictedPaths: ['/upload', '/admin', '/settings', '/interviews', '/submissions']
  }
};

export function useRoleBasedRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const currentPath = location.pathname;
    const userRole = user.role || '';
    const config = roleConfig[userRole];

    if (!config) {
      console.warn(`Unknown role: ${userRole}`);
      navigate('/dashboard');
      return;
    }

    // Check if current path is restricted for this role
    const isRestricted = config.restrictedPaths.some((path: string) => {
      if (path.endsWith('/*')) {
        return currentPath.startsWith(path.slice(0, -2));
      }
      return currentPath === path;
    });

    if (isRestricted) {
      console.log(`Access denied for role ${userRole} to path ${currentPath}. Redirecting to ${config.defaultPath}`);
      navigate(config.defaultPath, { replace: true });
      return;
    }

    // Check if user is on a page they shouldn't see (e.g., candidate on dashboard)
    if (userRole === 'candidate' && currentPath.startsWith('/dashboard')) {
      navigate('/apply', { replace: true });
      return;
    }

  }, [user, isAuthenticated, location, navigate]);
}

export function isPathAllowedForRole(path: string, role: string): boolean {
  const config = roleConfig[role];
  if (!config) return false;

  // Check if path is restricted
  const isRestricted = config.restrictedPaths.some(restrictedPath => {
    if (restrictedPath.endsWith('/*')) {
      return path.startsWith(restrictedPath.slice(0, -2));
    }
    return path === restrictedPath;
  });

  return !isRestricted;
}
