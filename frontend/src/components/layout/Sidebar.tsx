import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileSearch,
  Users,
  Briefcase,
  GitCompare,
  Settings,
  Sparkles,
  Eye,
} from "lucide-react";

const links = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Resume Analyzer", path: "/upload", icon: FileSearch },
  { label: "Section Preview", path: "/section-preview", icon: Eye },
  { label: "Candidates", path: "/candidates", icon: Users },
  { label: "Jobs", path: "/jobs", icon: Briefcase },
  { label: "Matching", path: "/matching", icon: GitCompare },
  { label: "Settings", path: "/settings", icon: Settings },
];

type SidebarProps = {
  open?: boolean;
};

export default function Sidebar({ open = true }: SidebarProps) {
  return (
    <aside
      className={`hidden flex-shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-all duration-200 ease-in-out lg:flex lg:flex-col ${
        open ? "w-64" : "w-0"
      }`}
    >
      <div className="flex flex-col h-full w-64 px-4 py-6">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-sm shadow-purple-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              ATS Analyzer
            </p>
            <p className="text-xs text-gray-500">AI-Powered Recruitment</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 text-sm font-medium">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-500/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Demo Mode Badge */}
        <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-blue-700">Demo Mode</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
