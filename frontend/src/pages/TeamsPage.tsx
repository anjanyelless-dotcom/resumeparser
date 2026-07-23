import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Users, UserCheck, UserCog, Search } from "lucide-react";

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  team_lead_id?: string | null;
}

interface Team {
  lead: UserRecord;
  members: UserRecord[];
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [soloRecruiters, setSoloRecruiters] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/users", { params: { limit: 200 } });
      const users: UserRecord[] = res.data.users || res.data || [];

      // Build team map: group recruiters by their team_lead_id
      const leadMap = new Map<string, UserRecord>();
      const recruitersByLead = new Map<string, UserRecord[]>();

      users.forEach(u => {
        if (u.role === "team_lead" || u.role === "manager") {
          leadMap.set(u.id, u);
        }
      });

      users.forEach(u => {
        if (u.team_lead_id) {
          const arr = recruitersByLead.get(u.team_lead_id) || [];
          arr.push(u);
          recruitersByLead.set(u.team_lead_id, arr);
        }
      });

      const builtTeams: Team[] = [];
      leadMap.forEach((lead, leadId) => {
        builtTeams.push({
          lead,
          members: recruitersByLead.get(leadId) || [],
        });
      });

      // Also get leads who have members but weren't found by role
      recruitersByLead.forEach((members, leadId) => {
        if (!leadMap.has(leadId)) {
          const lead = users.find(u => u.id === leadId);
          if (lead) {
            builtTeams.push({ lead, members });
          }
        }
      });

      const solo = users.filter(u => !u.team_lead_id && u.role === "recruiter");
      setTeams(builtTeams);
      setSoloRecruiters(solo);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeams = teams.filter(t => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.lead.name?.toLowerCase().includes(q) ||
      t.lead.email?.toLowerCase().includes(q) ||
      t.members.some(m => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
    );
  });

  const roleColor = (role?: string) => {
    switch (role) {
      case "team_lead": return "bg-purple-100 text-purple-700";
      case "manager": return "bg-blue-100 text-blue-700";
      case "recruiter": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const UserAvatar = ({ user, size = "md" }: { user: UserRecord; size?: "sm" | "md" }) => {
    const s = size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm";
    return (
      <div className={`${s} bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0`}>
        <span className="font-semibold text-indigo-600">
          {(user.name || user.email || "?").charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="w-7 h-7 text-purple-600" />
          </div>
          Teams
        </h1>
        <p className="text-gray-500 mt-2">View team structure grouped by Team Lead</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg"><UserCog className="w-5 h-5 text-purple-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Teams</p>
            <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg"><UserCheck className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Recruiters</p>
            <p className="text-2xl font-bold text-gray-900">
              {teams.reduce((sum, t) => sum + t.members.length, 0) + soloRecruiters.length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-lg"><Users className="w-5 h-5 text-orange-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Unassigned Recruiters</p>
            <p className="text-2xl font-bold text-gray-900">{soloRecruiters.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams or members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTeams.map(team => (
            <div key={team.lead.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Team Lead Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <UserAvatar user={team.lead} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{team.lead.name || team.lead.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(team.lead.role)}`}>
                        {team.lead.role?.replace("_", " ") || "Team Lead"}
                      </span>
                      <span className="text-xs text-gray-500">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div className="p-4">
                {team.members.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No recruiters assigned</p>
                ) : (
                  <div className="space-y-2">
                    {team.members.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <UserAvatar user={m} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.name || m.email}</p>
                          <p className="text-xs text-gray-500 truncate">{m.email}</p>
                        </div>
                        <span className={`ml-auto flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(m.role)}`}>
                          {m.role || "Recruiter"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Unassigned */}
          {soloRecruiters.length > 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-600">Unassigned Recruiters</p>
                <p className="text-xs text-gray-400">{soloRecruiters.length} recruiter{soloRecruiters.length !== 1 ? "s" : ""} without a team lead</p>
              </div>
              <div className="p-4 space-y-2">
                {soloRecruiters.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <UserAvatar user={m} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.name || m.email}</p>
                      <p className="text-xs text-gray-500 truncate">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
