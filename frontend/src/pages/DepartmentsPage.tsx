import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Building2, Briefcase, Search, BarChart3 } from "lucide-react";

interface Department {
  name: string;
  jobCount: number;
  activeJobs: number;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      // Reuse existing jobs endpoint — fetch all and aggregate by department
      const res = await api.get("/jobs", { params: { limit: 500 } });
      const jobs = res.data.jobs || res.data || [];

      const deptMap = new Map<string, { total: number; active: number }>();
      jobs.forEach((job: any) => {
        const dept = job.department || "Unspecified";
        const existing = deptMap.get(dept) || { total: 0, active: 0 };
        existing.total++;
        if (job.status === "active") existing.active++;
        deptMap.set(dept, existing);
      });

      const deptList: Department[] = Array.from(deptMap.entries())
        .map(([name, counts]) => ({ name, jobCount: counts.total, activeJobs: counts.active }))
        .sort((a, b) => b.jobCount - a.jobCount);

      setDepartments(deptList);
    } catch (err) {
      console.error("Failed to load departments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  const maxCount = Math.max(...departments.map(d => d.jobCount), 1);

  const deptColors = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-green-500 to-green-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
    "from-cyan-500 to-cyan-600",
    "from-indigo-500 to-indigo-600",
    "from-amber-500 to-amber-600",
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          Departments
        </h1>
        <p className="text-gray-500 mt-2">Departments derived from active job requirements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Building2 className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Departments</p>
            <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg"><Briefcase className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Requirements</p>
            <p className="text-2xl font-bold text-gray-900">{departments.reduce((s, d) => s + d.jobCount, 0)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg"><BarChart3 className="w-5 h-5 text-purple-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Active Requirements</p>
            <p className="text-2xl font-bold text-gray-900">{departments.reduce((s, d) => s + d.activeJobs, 0)}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No departments found</h3>
          <p className="text-gray-500 text-sm">Departments are derived from job requirements. Create some jobs to see departments here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((dept, i) => (
            <div key={dept.name} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Color bar */}
              <div className={`h-2 bg-gradient-to-r ${deptColors[i % deptColors.length]}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{dept.jobCount} total requirement{dept.jobCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${deptColors[i % deptColors.length]} text-white`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>

                {/* Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Active</span>
                    <span className="text-xs font-medium text-gray-900">{dept.activeJobs} / {dept.jobCount}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${deptColors[i % deptColors.length]} rounded-full transition-all`}
                      style={{ width: `${maxCount > 0 ? (dept.jobCount / maxCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-lg font-bold text-green-600">{dept.activeJobs}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-gray-500">Other</p>
                    <p className="text-lg font-bold text-gray-600">{dept.jobCount - dept.activeJobs}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
