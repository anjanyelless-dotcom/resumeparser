import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ClipboardCheck,
  Database,
  FileText,
  Menu,
  UploadCloud,
  Users,
} from "lucide-react";
import { useLayout } from "../../contexts/LayoutContext";
import Button from "../common/Button";
import { NAV_ITEMS } from "../../utils/constants";
import { useAuthStore } from "../../store/authStore";

const icons = {
  "/": FileText,
  "/upload": UploadCloud,
  "/candidates": Users,
  "/accuracy": BarChart3,
  "/corrections": ClipboardCheck,
  "/taxonomy": Database,
};

export default function Header() {
  const navigate = useNavigate();
  const { accessToken, clearTokens } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useLayout();

  const handleAuthClick = () => {
    if (accessToken) {
      clearTokens();
      return;
    }
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              aria-label="Show sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-subtle">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              Resume Parser
            </p>
            <p className="text-xs text-slate-500">Talent Intelligence Suite</p>
          </div>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = icons[item.path as keyof typeof icons];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 transition ${
                    isActive ? "text-brand-600" : "hover:text-slate-900"
                  }`
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </NavLink>
            );
          })}
          <Button variant="ghost" size="sm" onClick={handleAuthClick}>
            {accessToken ? "Logout" : "Login"}
          </Button>
        </nav>
      </div>
    </header>
  );
}
