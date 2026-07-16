import {
  LayoutDashboard,
  Users,
  Briefcase,
  GitCompare,
  Building2,
  MessageSquare,
  BarChart3,
  Settings,
} from 'lucide-react';

export type UserRole = 'admin' | 'recruiter' | 'team_lead' | 'client_manager' | 'bdm' | 'viewer';

export interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  path?: string;
  children?: MenuItem[];
  roles?: UserRole[];
  badge?: number;
  badgeType?: 'notification' | 'duplicate' | 'alert';
}

export const sidebarMenuConfig: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    children: [
      { id: 'dashboard-overview', label: 'Overview', path: '/dashboard' },
      { id: 'dashboard-team-lead', label: 'Team Lead Dashboard', path: '/team-lead/dashboard', roles: ['team_lead'] },
      { id: 'dashboard-client-manager', label: 'Client Manager Dashboard', path: '/client-manager/dashboard', roles: ['client_manager'] },
      { id: 'dashboard-bdm', label: 'BDM Dashboard', path: '/bdm/dashboard', roles: ['bdm'] },
    ],
  },
  {
    id: 'candidates',
    label: 'Candidates',
    icon: Users,
    children: [
      { id: 'candidates-all', label: 'All Candidates', path: '/candidates' },
      { id: 'candidates-filter-search', label: 'Filter Search', path: '/candidates/filter-search' },
      { id: 'candidates-upload', label: 'Upload Resume', path: '/upload' },
      { id: 'candidates-mine', label: 'My Candidates', path: '/recruiter/candidates', roles: ['recruiter'] },
    ],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: Briefcase,
    children: [
      { id: 'jobs-all', label: 'All Jobs', path: '/jobs' },
      { id: 'jobs-create', label: 'Create Job', path: '/jobs/create' },
      { id: 'jobs-oversight', label: 'Job Oversight', path: '/job-oversight', roles: ['admin', 'team_lead'] },
    ],
  },
  {
    id: 'matching',
    label: 'Matching',
    icon: GitCompare,
    children: [
      { id: 'matching-resume', label: 'Resume Matching', path: '/matching' },
      { id: 'matching-jd', label: 'JD Matching', path: '/jd-matching' },
      { id: 'matching-history', label: 'Match History', path: '/matching/history' },
    ],
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: Building2,
    children: [
      { id: 'recruitment-clients', label: 'Clients', path: '/clients', roles: ['admin', 'client_manager', 'bdm'] },
      { id: 'recruitment-interviews', label: 'Interviews', path: '/interviews', roles: ['admin', 'recruiter'] },
      { id: 'recruitment-submissions', label: 'Submissions', path: '/submissions', roles: ['admin', 'recruiter'] },
      { id: 'recruitment-assignments', label: 'My Assignments', path: '/my-assignments', roles: ['recruiter'] },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    children: [
      { id: 'communication-history', label: 'Message History', path: '/messages' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    children: [
      { id: 'reports-analytics', label: 'Analytics', path: '/analytics' },
      { id: 'reports-kpis', label: 'Team KPIs', path: '/team-kpis', roles: ['admin', 'team_lead'] },
      { id: 'reports-bdm', label: 'BDM Reports', path: '/bdm/reports', roles: ['bdm'] },
      { id: 'reports-accuracy', label: 'Accuracy', path: '/accuracy', roles: ['admin'] },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Settings,
    roles: ['admin'],
    children: [
      { id: 'admin-settings', label: 'Settings', path: '/settings' },
    ],
  },
];
