import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Award, DollarSign, User, Briefcase, Building2, Calendar, ArrowLeft, TrendingUp } from "lucide-react";

interface Placement {
  id: string;
  candidate_name?: string;
  candidate_email?: string;
  job_title?: string;
  client_name?: string;
  recruiter_name?: string;
  billing_amount?: number;
  placed_at?: string;
  joining_date?: string;
}

export default function PlacementsPage() {
  const navigate = useNavigate();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchPlacements();
  }, []);

  const fetchPlacements = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/placements/records");
      const data = res.data;
      const list: Placement[] = data.placements || data.data || data || [];
      setPlacements(list);
      const rev = list.reduce((sum: number, p: Placement) => sum + (p.billing_amount || 0), 0);
      setTotalRevenue(rev);
    } catch (err) {
      console.error("Failed to load placements:", err);
      setPlacements([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Award className="w-7 h-7 text-emerald-600" />
              </div>
              Placements
            </h1>
            <p className="text-gray-500 mt-2">Track all candidate placements and revenue</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 min-w-[140px] text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Placements</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{placements.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 min-w-[160px] text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                ${totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "This Month", value: placements.filter(p => {
              if (!p.placed_at) return false;
              const d = new Date(p.placed_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length, icon: <Calendar className="w-5 h-5" />, color: "text-purple-600 bg-purple-100" },
          { label: "Active Placements", value: placements.length, icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-100" },
          { label: "Avg Billing", value: placements.length > 0 ? `$${Math.round(totalRevenue / placements.length).toLocaleString()}` : "$0", icon: <DollarSign className="w-5 h-5" />, color: "text-blue-600 bg-blue-100" },
          { label: "Clients Served", value: new Set(placements.map(p => p.client_name).filter(Boolean)).size, icon: <Building2 className="w-5 h-5" />, color: "text-orange-600 bg-orange-100" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.color.split(' ')[1]}`}>
              <span className={stat.color.split(' ')[0]}>{stat.icon}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Placements</h2>
          <span className="text-sm text-gray-500">{placements.length} total</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading placements…</p>
          </div>
        ) : placements.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No placements yet</h3>
            <p className="text-gray-500 text-sm">Placements will appear here once candidates are placed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Candidate", "Job Title", "Client", "Recruiter", "Billing Amount", "Placed On", "Joining Date"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {placements.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-emerald-600">
                            {(p.candidate_name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.candidate_name || "—"}</p>
                          <p className="text-xs text-gray-500">{p.candidate_email || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900">{p.job_title || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900">{p.client_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900">{p.recruiter_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-emerald-600">
                        {p.billing_amount != null ? `$${Number(p.billing_amount).toLocaleString()}` : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {p.placed_at ? new Date(p.placed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {p.joining_date ? new Date(p.joining_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
