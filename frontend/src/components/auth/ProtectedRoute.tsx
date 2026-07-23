import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If specific roles are required and user's role is not allowed
  if (allowedRoles.length > 0 && (!user.role || !allowedRoles.includes(user.role))) {
    // Redirect candidates to apply page, others to dashboard
    const fallbackRoute = user.role === 'candidate' ? '/apply' : '/dashboard';
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
}

// Higher-order component for specific role protections
export function CandidateRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      {children}
    </ProtectedRoute>
  );
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      {children}
    </ProtectedRoute>
  );
}

export function RecruiterRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'recruiter', 'team_lead']}>
      {children}
    </ProtectedRoute>
  );
}

export function StaffRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'recruiter', 'team_lead', 'client_manager', 'bdm']}>
      {children}
    </ProtectedRoute>
  );
}
