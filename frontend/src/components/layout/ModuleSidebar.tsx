import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  UserCheck,
  Users,
  Sparkles,
  Target,
  Award,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";

import { useAuthStore } from "../../store/useAuthStore";

interface ModuleItem {
  id: string;
  label: string;
  path: string;
  icon: any;
}

const defaultModules: ModuleItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'business-development', label: 'Business Development', path: '/business-development', icon: FolderKanban },
  { id: 'recruitment-planning', label: 'Recruitment Planning', path: '/recruitment-planning', icon: Briefcase },
  { id: 'team-lead-management', label: 'Team Lead Management', path: '/team-lead-management', icon: UserCheck },
  { id: 'candidate-sourcing', label: 'Candidate Sourcing', path: '/candidate-sourcing', icon: Users },
  { id: 'ai-recruitment', label: 'AI Recruitment', path: '/ai-recruitment', icon: Sparkles },
  { id: 'hiring-process', label: 'Hiring Process', path: '/hiring-process', icon: Target },
  { id: 'analytics-reports', label: 'Analytics & Reports', path: '/analytics-reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
];

const recruiterModules: ModuleItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'my-assignments', label: 'My Assignments', path: '/jobs/my-assignments', icon: Briefcase },
  { id: 'candidate-sourcing', label: 'Candidate Sourcing', path: '/candidate-sourcing', icon: Users },
  { id: 'ai-recruitment', label: 'AI Recruitment', path: '/ai-recruitment', icon: Sparkles },
  { id: 'hiring-process', label: 'Hiring Process', path: '/hiring-process', icon: Target },
  { id: 'analytics-reports', label: 'Analytics & Reports', path: '/analytics-reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
];

type ModuleSidebarProps = {
  open?: boolean;
};

export default function ModuleSidebar({ open = true }: ModuleSidebarProps) {
  const { user } = useAuthStore();

  let currentModules = defaultModules;
  if (user?.role === 'recruiter') {
    currentModules = recruiterModules;
  } else if (user?.role === 'admin') {
    currentModules = [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: defaultModules[0].icon },
      { id: 'my-assignments', label: 'My Assignments', path: '/jobs/my-assignments', icon: recruiterModules[1].icon },
      ...defaultModules.slice(1)
    ];
  }

  return (
    <aside
      className={`hidden flex-shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-all duration-200 ease-in-out lg:flex lg:flex-col ${open ? "w-64" : "w-0"
        }`}
    >
      <div className="flex flex-col h-full w-64 px-4 py-6">
        {/* Logo */}
        <div className="mb-4 pb-6 border-b border-slate-100 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Resume Parser
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 text-sm font-medium">
          {currentModules.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 ${isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
