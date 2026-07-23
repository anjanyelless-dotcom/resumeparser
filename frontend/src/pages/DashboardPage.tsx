import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCandidateStore } from "../store/useCandidateStore";
import { useJobStore } from "../store/useJobStore";
import { useAuthStore } from "../store/useAuthStore";
import { usePermissionStore } from "../store/usePermissionStore";
import { api } from "../services/api";
import { DashboardCard } from "../components/dashboard/DashboardCard";
import PermissionGuard from "../components/common/PermissionGuard";
import { getRequiredPermission } from "../utils/routePermissions";
import {
  businessDevelopment,
  recruitmentPlanning,
  teamLeadManagement,
  candidateSourcing,
  aiRecruitment,
  hiringProcess,
  teamManagement,
  analyticsReports,
  administration,
  quickActions,
} from "../config/dashboardConfig";
import {
  Users, Briefcase, FileText, Calendar, TrendingUp, Activity,
  Settings, UserCheck, Building2, Brain, Upload, FolderKanban,
  Sparkles, Target, Award, Star, BarChart3, Shield, CheckCircle2, XCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface RecentActivity {
  id: string;
  type: "candidate" | "job" | "submission" | "interview" | "system";
  description: string;
  timestamp: string;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatRelativeTime(ts: string): string {
  try {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch { return ts; }
}

const metricIconMap: Record<string, any> = {
  candidates: Users, jobs: Briefcase, "open-requirements": Target,
  clients: Building2, "today-submissions": FileText, "interviews-scheduled": Calendar,
  "parsed-resumes": Brain, "ai-match-success": TrendingUp, submissions: FileText, upload: Upload,
};

// ─── Section definition ───────────────────────────────────────
interface SectionDef {
  key: string;
  title: string;
  icon: React.ReactNode;
  modules: any[];
  cols: string;         // Tailwind grid-cols-* class
}

// ─── Main Page ────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { candidates, fetchCandidates, pagination: candidatePagination } = useCandidateStore();
  const { jobs, fetchJobs, fetchMatchResults } = useJobStore();
  const { isAuthenticated, user } = useAuthStore();
  const hasPermission = usePermissionStore((s) => s.hasPermission);

  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [dynamicMetrics, setDynamicMetrics] = useState<any[]>([]);
  const [orgSummary, setOrgSummary] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const hasPerm = usePermissionStore.getState().hasPermission;
      const ps: Promise<any>[] = [];
      if (hasPerm("candidates", "view")) ps.push(fetchCandidates(1, 100));
      if (hasPerm("jobs", "view")) ps.push(fetchJobs());
      if (hasPerm("ai_matching", "view")) ps.push(fetchMatchResults("all"));
      if (ps.length) await Promise.all(ps);

      try {
        const res = await api.get("/dashboard/summary");
        const data = res.data;
        if (data?.metrics?.length) {
          setDynamicMetrics(data.metrics.map((m: any) => {
            const path = m.id === 'ai-match-success' ? '/analytics-reports/ai-analytics' : m.path;
            return {
              id: m.id, title: m.label, description: m.description || "",
              path, count: m.value, trend: m.trend, color: m.color,
              icon: metricIconMap[m.id] || TrendingUp,
            };
          }));
        }
        if (data?.recentActivities?.length) setRecentActivities(data.recentActivities);
        if (data?.orgSummary) setOrgSummary(data.orgSummary);
      } catch { /* no dashboard/summary endpoint yet – graceful skip */ }

      // Auto-navigate for Recruiters
      if (user?.role === "recruiter") {
        const jobs = useJobStore.getState().jobs;
        const activeJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Closed');
        if (activeJobs.length === 1) {
          navigate(`/recruiter/workspace/${activeJobs[0].id}`);
        } else if (activeJobs.length > 1) {
          navigate(`/recruiter/requirements`);
        }
      }

    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 400) navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Permission-aware visible modules ─────────────────────────
  const visible = (modules: any[]) =>
    modules.filter((m) => {
      const perm = getRequiredPermission(m.path.split("?")[0]);
      if (!perm) return true;
      return hasPermission(perm.module, perm.action);
    });

  // ── Navigate handler: respect ?tab= params ────────────────────
  const goTo = (module: any) => {
    const raw: string = module.path;
    const [pathname, search] = raw.split("?");
    const params = search ? Object.fromEntries(new URLSearchParams(search)) : undefined;

    if (raw.includes("?create=true")) {
      navigate(pathname, { state: { showCreateModal: true } });
      return;
    }
    if (params?.tab) {
      navigate(pathname, { state: { defaultTab: params.tab } });
      return;
    }
    navigate(pathname);
  };

  // ── Card with PermissionGuard ─────────────────────────────────
  const card = (m: any, handler = goTo) => {
    const perm = getRequiredPermission(m.path.split("?")[0]);
    const el = <DashboardCard key={m.id} {...m} onClick={() => handler(m)} />;
    if (!perm) return el;
    return (
      <PermissionGuard key={m.id} module={perm.module} action={perm.action} mode="hide">
        {el}
      </PermissionGuard>
    );
  };

  // ── Section renderer ──────────────────────────────────────────
  const section = ({ key, title, icon, modules, cols: _cols }: SectionDef) => {
    const mods = visible(modules);
    if (!mods.length) return null;
    const stripBrackets = (str: string) => str.replace(/\s*\([^)]*\)/g, '');

    return (
      <div key={key} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-green-600 flex-shrink-0">{icon}</span>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stripBrackets(title)}</h2>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`}>
          {mods.map((m) => card(m))}
        </div>
      </div>
    );
  };

  // ── Section definitions ───────────────────────────────────────
  const sections: SectionDef[] = [
    {
      key: "bdm", title: "BUSINESS DEVELOPMENT (BDM)",
      icon: <FolderKanban className="h-4 w-4" />,
      modules: businessDevelopment,
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
    },
    {
      key: "recruitment-planning", title: "RECRUITMENT PLANNING (MANAGER)",
      icon: <Briefcase className="h-4 w-4" />,
      modules: recruitmentPlanning,
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
    },
    {
      key: "team-lead", title: "TEAM LEAD MANAGEMENT",
      icon: <UserCheck className="h-4 w-4" />,
      modules: teamLeadManagement,
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
    },
    {
      key: "candidate-sourcing", title: "CANDIDATE SOURCING (RECRUITER)",
      icon: <Users className="h-4 w-4" />,
      modules: candidateSourcing.map((m) =>
        m.id === "candidates"
          ? { ...m, count: candidatePagination?.total_items || candidates?.length || 0 }
          : m
      ),
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
    },
    {
      key: "ai-recruitment", title: "AI RECRUITMENT",
      icon: <Sparkles className="h-4 w-4" />,
      modules: aiRecruitment,
      cols: "grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8",
    },
    {
      key: "hiring-process", title: "HIRING PROCESS (END TO END)",
      icon: <Target className="h-4 w-4" />,
      modules: hiringProcess,
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
    },
    {
      key: "team-management", title: "TEAM MANAGEMENT",
      icon: <Award className="h-4 w-4" />,
      modules: teamManagement,
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
    },
    {
      key: "analytics-reports", title: "ANALYTICS & REPORTS",
      icon: <BarChart3 className="h-4 w-4" />,
      modules: analyticsReports,
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
    },
    {
      key: "administration", title: "ADMINISTRATION",
      icon: <Settings className="h-4 w-4" />,
      modules: administration,
      cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
    },
  ];

  // ── Activity icon helper ──────────────────────────────────────
  const actIcon = (type: RecentActivity["type"]) => {
    const cls = "h-4 w-4";
    switch (type) {
      case "candidate": return <Users className={`${cls} text-blue-500`} />;
      case "job": return <Briefcase className={`${cls} text-green-500`} />;
      case "submission": return <FileText className={`${cls} text-purple-500`} />;
      case "interview": return <Calendar className={`${cls} text-orange-500`} />;
      default: return <Activity className={`${cls} text-gray-400`} />;
    }
  };

  // ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-72 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-96 mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-7">
            <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
            <div className="grid grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="bg-gray-100 rounded-xl h-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Admin Dashboard
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Welcome back, {user?.name || user?.email?.split("@")[0] || "Admin"}! Here's your comprehensive overview.
        </p>
      </div>

      {/* ── Organization Summary ── */}
      {orgSummary && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-indigo-600 flex-shrink-0"><Users className="h-4 w-4" /></span>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Organization Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
              icon={Users}
              title="Total Users"
              description="All registered users"
              count={orgSummary.totalUsers || 0}
              color="indigo"
              onClick={() => navigate("/users")}
            />
            <DashboardCard
              icon={UserCheck}
              title="Recruiters"
              description="Recruiter accounts"
              count={orgSummary.recruiters || 0}
              color="blue"
              onClick={() => navigate("/users")}
            />
            <DashboardCard
              icon={Award}
              title="Team Leads"
              description="Leading recruitment teams"
              count={orgSummary.teamLeads || 0}
              color="green"
              onClick={() => navigate("/users")}
            />
            <DashboardCard
              icon={Building2}
              title="Managers"
              description="Recruitment managers"
              count={orgSummary.managers || 0}
              color="purple"
              onClick={() => navigate("/users")}
            />
            <DashboardCard
              icon={FolderKanban}
              title="Business Development"
              description="BDM users"
              count={orgSummary.bdm || 0}
              color="orange"
              onClick={() => navigate("/users")}
            />
            <DashboardCard
              icon={CheckCircle2}
              title="Active Users"
              description="Currently active accounts"
              count={orgSummary.activeUsers || 0}
              color="green"
              onClick={() => navigate("/users")}
            />
            <DashboardCard
              icon={XCircle}
              title="Inactive Users"
              description="Disabled / inactive accounts"
              count={orgSummary.inactiveUsers || 0}
              color="red"
              onClick={() => navigate("/users")}
            />
          </div>
        </div>
      )}

      {/* ── Dynamic KPI Bar ── */}
      {dynamicMetrics.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-600 flex-shrink-0"><TrendingUp className="h-4 w-4" /></span>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Key Metrics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dynamicMetrics.map((m) => (
              <DashboardCard key={m.id} {...m} onClick={() => navigate(m.path)} />
            ))}
          </div>
        </div>
      )}

      {/* ── 9 Sections ── */}
      {sections.map((s) => section(s))}

      {/* ── Quick Actions ── */}
      {(() => {
        const mods = visible(quickActions);
        if (!mods.length) return null;
        return (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-600 flex-shrink-0"><Star className="h-4 w-4" /></span>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              {mods.map((m) => (
                <div key={m.id}>
                  {card(m, goTo)}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Bottom Row: Activity + Jobs + Candidates ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-2">

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            <Activity className="h-4 w-4 text-gray-300" />
          </div>
          <div className="p-4">
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-gray-50 flex-shrink-0">
                      {actIcon(a.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 line-clamp-2">{a.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(a.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="mx-auto h-10 w-10 text-gray-100 mb-2" />
                <p className="text-xs text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Jobs</h3>
            <Briefcase className="h-4 w-4 text-gray-300" />
          </div>
          <div className="p-4">
            {(jobs || []).length > 0 ? (
              <div className="space-y-2">
                {(jobs || []).slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="p-3 border border-gray-50 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <p className="text-xs font-semibold text-gray-900 truncate">{job.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{job.department} · {job.status}</p>
                  </div>
                ))}
                <button onClick={() => navigate("/jobs")} className="w-full text-center text-xs text-indigo-500 hover:text-indigo-700 py-2 font-medium">
                  View all jobs →
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="mx-auto h-10 w-10 text-gray-100 mb-2" />
                <p className="text-xs text-gray-400">No jobs yet</p>
                <button onClick={() => navigate("/jobs")} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium">Create job →</button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Candidates</h3>
            <Users className="h-4 w-4 text-gray-300" />
          </div>
          <div className="p-4">
            {(candidates || []).length > 0 ? (
              <div className="space-y-2">
                {(candidates || []).slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2 border border-gray-50 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/candidates/${c.id}`)}
                  >
                    <div className="h-7 w-7 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-indigo-600">
                        {c.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{c.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => navigate("/candidates")} className="w-full text-center text-xs text-indigo-500 hover:text-indigo-700 py-2 font-medium">
                  View all candidates →
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-10 w-10 text-gray-100 mb-2" />
                <p className="text-xs text-gray-400">No candidates yet</p>
                <button onClick={() => navigate("/candidates")} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium">View candidates →</button>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
