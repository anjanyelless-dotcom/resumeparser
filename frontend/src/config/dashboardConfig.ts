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
  UserPlus,
  Search,
  Eye,
  GitMerge,
  Layers,
  MapPin,
  Zap,
  HardDrive,
  CheckSquare,
  Star,
  LayoutDashboard,
  Send,
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
  permissionModule?: string;
  permissionAction?: string;
};

// ─────────────────────────────────────────────────────────────
// 1. BUSINESS DEVELOPMENT (BDM)
// ─────────────────────────────────────────────────────────────
export const businessDevelopment: DashboardModule[] = [
  {
    id: 'client-pipeline',
    title: 'Client Pipeline',
    description: 'Manage sales pipeline',
    icon: FolderKanban,
    path: '/bdm/pipeline',
    color: 'blue',
  },
  {
    id: 'clients',
    title: 'Clients',
    description: 'Manage all clients',
    icon: Building2,
    path: '/clients',
    color: 'green',
  },
  {
    id: 'bdm-requirements',
    title: 'BDM Requirements',
    description: 'My requirements',
    icon: Briefcase,
    path: '/bdm/requirements',
    color: 'orange',
  },
  {
    id: 'requirement-approval-bdm',
    title: 'Requirement Approval',
    description: 'Approve / reject requirements',
    icon: CheckSquare,
    path: '/requirement-approval',
    color: 'red',
  },
  {
    id: 'client-submission-tracking',
    title: 'Client Submission Tracking',
    description: 'Track client submissions',
    icon: FileCheck,
    path: '/bdm/submissions',
    color: 'cyan',
  },
];

// ─────────────────────────────────────────────────────────────
// 2. RECRUITMENT PLANNING (MANAGER)
// ─────────────────────────────────────────────────────────────
export const recruitmentPlanning: DashboardModule[] = [
  {
    id: 'jobs',
    title: 'Jobs',
    description: 'Manage job openings',
    icon: Briefcase,
    path: '/jobs',
    color: 'blue',
  },
  {
    id: 'team-lead-assignment',
    title: 'Team Lead Assignment',
    description: 'Assign team leads to jobs',
    icon: UserCog,
    path: '/jobs/team-lead-assignment',
    color: 'green',
  },
  {
    id: 'recruiter-assignment',
    title: 'Recruiter Assignment',
    description: 'Assign recruiters to jobs',
    icon: UserCheck,
    path: '/jobs/recruiter-assignment',
    color: 'purple',
  },
  {
    id: 'my-assignments',
    title: 'My Assignments',
    description: 'View my assignments',
    icon: ClipboardList,
    path: '/jobs/my-assignments',
    color: 'orange',
  },
  {
    id: 'requirement-approval-manager',
    title: 'Requirement Approval',
    description: 'Review & approve requirements',
    icon: CheckSquare,
    path: '/requirement-approval',
    color: 'red',

  },
];

// ─────────────────────────────────────────────────────────────
// 3. TEAM LEAD MANAGEMENT
// ─────────────────────────────────────────────────────────────
export const teamLeadManagement: DashboardModule[] = [
  {
    id: 'assigned-jobs',
    title: 'Assigned Jobs',
    description: 'View assigned jobs',
    icon: Briefcase,
    path: '/team-lead/assigned-jobs',
    color: 'blue',
  },
  {
    id: 'team-lead-recruiter-assignment',
    title: 'Recruiter Assignment',
    description: 'Assign recruiters',
    icon: UserCheck,
    path: '/team-lead/recruiter-assignment',
    color: 'green',
  },
  {
    id: 'shortlist-review',
    title: 'Shortlist Review',
    description: 'Review recruiter shortlists',
    icon: Star,
    path: '/team-lead/shortlist-review',
    color: 'orange',
  },
  {
    id: 'submission-review',
    title: 'Submission Review',
    description: 'Review before client',
    icon: FileCheck,
    path: '/team-lead/submission-review',
    color: 'red',
  },
  {
    id: 'team-dashboard',
    title: 'Team Dashboard',
    description: 'Team leads overview',
    icon: LayoutDashboard,
    path: '/team-lead/team-dashboard',
    color: 'indigo',
  },
];

// ─────────────────────────────────────────────────────────────
// 4. CANDIDATE SOURCING (RECRUITER)
// ─────────────────────────────────────────────────────────────
export const candidateSourcing: DashboardModule[] = [
  {
    id: 'boolean-search',
    title: 'Boolean Search',
    description: 'Advanced candidate search',
    icon: Search,
    path: '/candidates/boolean-search',
    color: 'blue',
  },
  {
    id: 'xray-search',
    title: 'X-Ray Search',
    description: 'Web & social search',
    icon: FileSearch,
    path: '/candidates/xray-search',
    color: 'green',
  },
  {
    id: 'upload-resume',
    title: 'Upload Resume',
    description: 'Upload candidate resumes',
    icon: Upload,
    path: '/upload',
    color: 'purple',
  },
  {
    id: 'resume-parsing',
    title: 'Resume Parsing',
    description: 'Parse & extract data',
    icon: Brain,
    path: '/parsing',
    color: 'orange',
  },
  {
    id: 'candidates',
    title: 'Candidates',
    description: 'Manage candidates',
    icon: Users,
    path: '/candidates',
    color: 'indigo',
  },
  {
    id: 'duplicate-candidates',
    title: 'Duplicate Candidates',
    description: 'Find duplicate profiles',
    icon: GitMerge,
    path: '/candidates/duplicates',
    color: 'red',
  },
];

// ─────────────────────────────────────────────────────────────
// 5. AI RECRUITMENT
// ─────────────────────────────────────────────────────────────
export const aiRecruitment: DashboardModule[] = [
  {
    id: 'jd-matching',
    title: 'JD Matching',
    description: 'Match JD with resumes',
    icon: Target,
    path: '/jd-matching',
    color: 'blue',
  },
  {
    id: 'ai-matching',
    title: 'AI Matching',
    description: 'AI powered matching',
    icon: Sparkles,
    path: '/matching',
    color: 'purple',
  },
  {
    id: 'resume-labeling',
    title: 'Resume Labeling',
    description: 'Categorise resumes',
    icon: Tag,
    path: '/settings/labeling',
    color: 'green',
  },
  {
    id: 'model-test',
    title: 'Model Test',
    description: 'Test AI models',
    icon: Zap,
    path: '/model-test',
    color: 'orange',
  },
  {
    id: 'section-preview',
    title: 'Section Preview',
    description: 'Preview extracted sections',
    icon: Eye,
    path: '/section-preview',
    color: 'cyan',
  },
  {
    id: 'model-accuracy',
    title: 'Model Accuracy',
    description: 'AI model performance',
    icon: Award,
    path: '/accuracy',
    color: 'indigo',
  },
];

// ─────────────────────────────────────────────────────────────
// 6. HIRING PROCESS (END TO END)
// ─────────────────────────────────────────────────────────────
export const hiringProcess: DashboardModule[] = [
  {
    id: 'shortlisted-candidates',
    title: 'Shortlisted Candidates',
    description: 'View shortlisted list',
    icon: Star,
    path: '/recruiter/shortlisted-candidates',
    color: 'blue',
  },
  {
    id: 'submissions',
    title: 'Submissions',
    description: 'Manage submissions',
    icon: Send,
    path: '/recruiter/submissions',
    color: 'green',
  },
  {
    id: 'client-review',
    title: 'Client Review',
    description: 'Client feedback on candidates',
    icon: FileCheck,
    path: '/client-manager/submissions',
    color: 'purple',
  },
  {
    id: 'interviews',
    title: 'Interviews',
    description: 'Schedule & manage interviews',
    icon: Calendar,
    path: '/interviews',
    color: 'orange',
  },
  {
    id: 'offer',
    title: 'Offer Management',
    description: 'Create & track offers',
    icon: FileText,
    path: '/offers',
    color: 'indigo',
  },
  {
    id: 'joining',
    title: 'Joining',
    description: 'Track candidate joining',
    icon: UserCheck,
    path: '/joining',
    color: 'cyan',
  },
  {
    id: 'placement',
    title: 'Placement',
    description: 'Manage placements',
    icon: Award,
    path: '/placements',
    color: 'red',
  },
];

// ─────────────────────────────────────────────────────────────
// 7. TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────
export const teamManagement: DashboardModule[] = [];

// ─────────────────────────────────────────────────────────────
// 8. ANALYTICS & REPORTS
// ─────────────────────────────────────────────────────────────
export const analyticsReports: DashboardModule[] = [
  {
    id: 'recruitment-analytics',
    title: 'Recruitment Analytics',
    description: 'Recruitment reports',
    icon: BarChart3,
    path: '/analytics',
    color: 'blue',
  },
  {
    id: 'analytics-parser',
    title: 'Parser Analytics',
    description: 'Parser performance',
    icon: Brain,
    path: '/analytics?tab=parser',
    color: 'green',
  },
  {
    id: 'analytics-ai',
    title: 'AI Analytics',
    description: 'AI insights',
    icon: Sparkles,
    path: '/analytics-reports/ai-analytics',
    color: 'purple',
  },
  {
    id: 'company-analytics',
    title: 'Company Analytics',
    description: 'Company intelligence',
    icon: Building2,
    path: '/company-intel',
    color: 'orange',
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Generate reports',
    icon: FileBarChart,
    path: '/reports',
    color: 'indigo',
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    description: 'System audit logs',
    icon: FileSearch,
    path: '/audit-logs',
    color: 'red',
  },
];

// ─────────────────────────────────────────────────────────────
// 9. ADMINISTRATION
// ─────────────────────────────────────────────────────────────
export const administration: DashboardModule[] = [];

// ─────────────────────────────────────────────────────────────
// 10. QUICK ACTIONS
// ─────────────────────────────────────────────────────────────
export const quickActions: DashboardModule[] = [
  {
    id: 'quick-create-client',
    title: 'Create Client',
    description: 'Create new client',
    icon: Plus,
    path: '/clients/new',
    color: 'blue',
  },
  {
    id: 'quick-create-requirement',
    title: 'Create Requirement',
    description: 'Add new requirement',
    icon: FileText,
    path: '/bdm/requirements/new',
    color: 'green',
  },
  {
    id: 'quick-create-job',
    title: 'Generate Job',
    description: 'Create new job',
    icon: Briefcase,
    path: '/jobs?create=true',
    color: 'purple',
  },
  {
    id: 'quick-assign-team-lead',
    title: 'Assign Team Lead',
    description: 'Assign TL to job',
    icon: UserCog,
    path: '/users',
    color: 'orange',
  },
  {
    id: 'quick-assign-recruiter',
    title: 'Assign Recruiter',
    description: 'Search candidates',
    icon: UserCheck,
    path: '/jobs',
    color: 'indigo',
  },
  {
    id: 'quick-upload-resume',
    title: 'Upload Resume',
    description: 'Upload candidates',
    icon: Upload,
    path: '/upload',
    color: 'cyan',
  },
  {
    id: 'quick-boolean-search',
    title: 'Boolean Search',
    description: 'Search candidates',
    icon: Search,
    path: '/candidates/boolean-search',
    color: 'blue',
  },
  {
    id: 'quick-xray-search',
    title: 'X-Ray Search',
    description: 'Search candidates',
    icon: FileSearch,
    path: '/candidates/xray-search',
    color: 'green',
  },
  {
    id: 'quick-create-submission',
    title: 'Create Submission',
    description: 'Submit candidates',
    icon: Send,
    path: '/recruiter/submissions',
    color: 'purple',
  },
  {
    id: 'quick-schedule-interview',
    title: 'Schedule Interview',
    description: 'Schedule interview',
    icon: Calendar,
    path: '/interviews',
    color: 'orange',
  },
  {
    id: 'quick-create-offer',
    title: 'Create Offer',
    description: 'Your candidate',
    icon: Award,
    path: '/recruiter/submissions',
    color: 'red',
  },
  {
    id: 'quick-mark-joining',
    title: 'Mark Joining',
    description: 'Your candidate',
    icon: UserPlus,
    path: '/recruiter/submissions',
    color: 'indigo',
  },
  {
    id: 'quick-create-user',
    title: 'Create User',
    description: 'Add system user',
    icon: UserCog,
    path: '/users/create',
    color: 'cyan',
  },
];

// ─────────────────────────────────────────────────────────────
// Legacy exports (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────
export const recruitmentOperations = candidateSourcing;
export const resumeIntelligence = aiRecruitment;
export const clientBdmOperations = businessDevelopment;
export const systemAdministration = administration;
