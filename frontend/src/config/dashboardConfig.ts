import {
  Users,
  Briefcase,
  UserCheck,
  Building2,
  FileText,
  Calendar,
  Brain,
  TrendingUp,
  Upload,
  FileSearch,
  Tag,
  BarChart3,
  Sparkles,
  Shield,
  LayoutDashboard,
  Target,
  Award,
  UserCog,
  ClipboardList,
  FileCheck,
  FolderKanban,
  FileBarChart,
  Settings,
  Bell,
  Activity,
  Plus,
  UserPlus
} from 'lucide-react';

export type DashboardModule = {
  id: string;
  title: string;
  description: string;
  icon: any;
  path: string;
  count?: number | string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink' | 'cyan';
};

// Key Metrics Section
export const keyMetrics: DashboardModule[] = [
  {
    id: 'total-candidates',
    title: 'Total Candidates',
    description: 'All registered candidates',
    icon: Users,
    path: '/candidates',
    count: 1250,
    trend: { value: 12, isPositive: true },
    color: 'blue'
  },
  {
    id: 'active-jobs',
    title: 'Active Jobs',
    description: 'Open job positions',
    icon: Briefcase,
    path: '/jobs',
    count: 45,
    trend: { value: 8, isPositive: true },
    color: 'green'
  },
  {
    id: 'total-recruiters',
    title: 'Total Recruiters',
    description: 'Active recruiters',
    icon: UserCheck,
    path: '/users',
    count: 28,
    trend: { value: 5, isPositive: true },
    color: 'purple'
  },
  {
    id: 'total-clients',
    title: 'Total Clients',
    description: 'Partner organizations',
    icon: Building2,
    path: '/clients',
    count: 15,
    trend: { value: 3, isPositive: true },
    color: 'orange'
  },
  {
    id: 'today-submissions',
    title: "Today's Submissions",
    description: 'Resumes submitted today',
    icon: FileText,
    path: '/submissions',
    count: 23,
    trend: { value: 15, isPositive: true },
    color: 'cyan'
  },
  {
    id: 'interviews-scheduled',
    title: 'Interviews Scheduled',
    description: 'Upcoming interviews',
    icon: Calendar,
    path: '/interviews',
    count: 8,
    trend: { value: 2, isPositive: false },
    color: 'red'
  },
  {
    id: 'parsed-resumes',
    title: 'Parsed Resumes',
    description: 'Successfully processed',
    icon: Brain,
    path: '/analytics',
    count: 1180,
    trend: { value: 18, isPositive: true },
    color: 'indigo'
  },
  {
    id: 'ai-match-success',
    title: 'AI Match Success Rate',
    description: 'Matching accuracy',
    icon: TrendingUp,
    path: '/analytics',
    count: '87%',
    trend: { value: 5, isPositive: true },
    color: 'green'
  }
];

// Recruitment Operations Section
export const recruitmentOperations: DashboardModule[] = [
  {
    id: 'candidates',
    title: 'Candidates',
    description: 'Manage all candidate profiles',
    icon: Users,
    path: '/candidates',
    color: 'blue'
  },
  {
    id: 'jobs',
    title: 'Jobs',
    description: 'Manage job openings',
    icon: Briefcase,
    path: '/jobs',
    color: 'green'
  },
  {
    id: 'recruiter-requirements',
    title: 'Recruiter Requirements',
    description: 'View recruiter job requirements',
    icon: FileText,
    path: '/recruiter-requirements',
    color: 'purple'
  },
  {
    id: 'recruiter-candidates',
    title: 'Recruiter Candidates',
    description: 'Candidates assigned to recruiters',
    icon: UserCheck,
    path: '/recruiter-candidates',
    color: 'orange'
  },
  {
    id: 'recruiter-submissions',
    title: 'Recruiter Submissions',
    description: 'Track recruiter submissions',
    icon: FileCheck,
    path: '/recruiter-submissions',
    color: 'cyan'
  },
  {
    id: 'search-candidates',
    title: 'Search Candidates',
    description: 'Advanced candidate search',
    icon: FileSearch,
    path: '/search-candidates',
    color: 'indigo'
  },
  {
    id: 'jd-matching',
    title: 'JD Matching',
    description: 'Job description matching',
    icon: Target,
    path: '/matching',
    color: 'pink'
  }
];

// Resume Intelligence Section
export const resumeIntelligence: DashboardModule[] = [
  {
    id: 'upload-resume',
    title: 'Upload Resume',
    description: 'Parse and analyze resumes',
    icon: Upload,
    path: '/upload',
    color: 'blue'
  },
  {
    id: 'resume-parsing',
    title: 'Resume Parsing',
    description: 'AI-powered resume extraction',
    icon: Brain,
    path: '/parsing',
    color: 'green'
  },
  {
    id: 'resume-labeling',
    title: 'Resume Labeling',
    description: 'Categorize and tag resumes',
    icon: Tag,
    path: '/labeling',
    color: 'purple'
  },
  {
    id: 'parser-analytics',
    title: 'Parser Analytics',
    description: 'Parsing performance metrics',
    icon: BarChart3,
    path: '/analytics',
    color: 'orange'
  },
  {
    id: 'ai-analytics',
    title: 'AI Analytics',
    description: 'AI model performance',
    icon: Sparkles,
    path: '/ai-analytics',
    color: 'indigo'
  }
];

// Team Management Section
export const teamManagement: DashboardModule[] = [
  {
    id: 'users-management',
    title: 'Users Management',
    description: 'Manage system users',
    icon: UserCog,
    path: '/users',
    color: 'blue'
  },
  {
    id: 'roles-permissions',
    title: 'Roles & Permissions',
    description: 'Configure access controls',
    icon: Shield,
    path: '/roles',
    color: 'green'
  },
  {
    id: 'team-lead-dashboard',
    title: 'Team Lead Dashboard',
    description: 'Team performance overview',
    icon: LayoutDashboard,
    path: '/team-lead-dashboard',
    color: 'purple'
  },
  {
    id: 'team-requirements',
    title: 'Team Requirements',
    description: 'Team job requirements',
    icon: Target,
    path: '/team-requirements',
    color: 'orange'
  },
  {
    id: 'team-kpis',
    title: 'Team KPIs',
    description: 'Key performance indicators',
    icon: Award,
    path: '/team-kpis',
    color: 'cyan'
  },
  {
    id: 'submission-review-queue',
    title: 'Submission Review Queue',
    description: 'Review pending submissions',
    icon: ClipboardList,
    path: '/submission-review',
    color: 'red'
  }
];

// Client & BDM Operations Section
export const clientBdmOperations: DashboardModule[] = [
  {
    id: 'client-manager-dashboard',
    title: 'Client Manager Dashboard',
    description: 'Client management overview',
    icon: LayoutDashboard,
    path: '/client-manager-dashboard',
    color: 'blue'
  },
  {
    id: 'client-manager-requirements',
    title: 'Client Manager Requirements',
    description: 'Client job requirements',
    icon: FileText,
    path: '/client-requirements',
    color: 'green'
  },
  {
    id: 'client-submission-tracking',
    title: 'Client Submission Tracking',
    description: 'Track client submissions',
    icon: FileCheck,
    path: '/client-submissions',
    color: 'purple'
  },
  {
    id: 'interview-coordination',
    title: 'Interview Coordination',
    description: 'Schedule and manage interviews',
    icon: Calendar,
    path: '/interviews',
    color: 'orange'
  },
  {
    id: 'bdm-dashboard',
    title: 'BDM Dashboard',
    description: 'Business development overview',
    icon: LayoutDashboard,
    path: '/bdm-dashboard',
    color: 'indigo'
  },
  {
    id: 'client-pipeline',
    title: 'Client Pipeline',
    description: 'Sales pipeline management',
    icon: FolderKanban,
    path: '/client-pipeline',
    color: 'pink'
  },
  {
    id: 'bdm-requirements',
    title: 'BDM Requirements',
    description: 'Business development requirements',
    icon: Briefcase,
    path: '/bdm-requirements',
    color: 'cyan'
  }
];

// System Administration Section
export const systemAdministration: DashboardModule[] = [
  {
    id: 'reports',
    title: 'Reports',
    description: 'Generate system reports',
    icon: FileBarChart,
    path: '/reports',
    color: 'blue'
  },
  {
    id: 'company-analytics',
    title: 'Company Analytics',
    description: 'Company intelligence',
    icon: Building2,
    path: '/company-analytics',
    color: 'green'
  },
  {
    id: 'activity-logs',
    title: 'Activity Logs',
    description: 'System activity tracking',
    icon: Activity,
    path: '/activity-logs',
    color: 'purple'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage system notifications',
    icon: Bell,
    path: '/notifications',
    color: 'orange'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'System configuration',
    icon: Settings,
    path: '/settings',
    color: 'indigo'
  }
];

// Quick Actions
export const quickActions = [
  {
    id: 'create-job',
    title: 'Create Job',
    description: 'Add new job posting',
    icon: Plus,
    path: '/jobs/create',
    color: 'green' as const
  },
  {
    id: 'upload-resume',
    title: 'Upload Resume',
    description: 'Parse candidate resume',
    icon: Upload,
    path: '/upload',
    color: 'blue' as const
  },
  {
    id: 'add-candidate',
    title: 'Add Candidate',
    description: 'Register new candidate',
    icon: UserPlus,
    path: '/candidates/create',
    color: 'purple' as const
  },
  {
    id: 'create-user',
    title: 'Create User',
    description: 'Add system user',
    icon: UserCog,
    path: '/users/create',
    color: 'orange' as const
  }
];
