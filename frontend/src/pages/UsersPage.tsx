import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import toast from "react-hot-toast";
import { 
  Users, User, UserCheck, Briefcase, Building, 
  CheckCircle, XCircle, Search, Edit, Trash2, 
  Ban, Power, UserPlus, ChevronLeft, ChevronRight 
} from "lucide-react";
import PermissionGuard from "../components/common/PermissionGuard";

const RoleColors: Record<string, string> = {
  'admin': 'bg-red-100 text-red-600',
  'recruiter': 'bg-blue-100 text-blue-600',
  'team_lead': 'bg-blue-100 text-blue-600',
  'bdm': 'bg-purple-100 text-purple-600',
  'client_manager': 'bg-orange-100 text-orange-600'
};

const RoleLabels: Record<string, string> = {
  'admin': 'Admin',
  'recruiter': 'Recruiter',
  'team_lead': 'Team Lead',
  'bdm': 'BDM',
  'client_manager': 'Client Manager'
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { 
    users, total, userStats, isLoading, error, 
    fetchUsers, fetchUserStats, deleteUser, 
    activateUser, deactivateUser 
  } = useUserStore();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");

  useEffect(() => {
    fetchUserStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers((currentPage - 1) * itemsPerPage, itemsPerPage, {
        search: search || undefined,
        role: roleFilter !== 'All Roles' ? roleFilter : undefined,
        status: statusFilter !== 'All Status' ? statusFilter : undefined
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, search, roleFilter, statusFilter]);

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${email}?`)) return;
    try {
      await deleteUser(userId);
      toast.success("User deleted successfully");
      fetchUsers((currentPage - 1) * itemsPerPage, itemsPerPage);
      fetchUserStats();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await deactivateUser(userId);
        toast.success("User disabled successfully");
      } else {
        await activateUser(userId);
        toast.success("User enabled successfully");
      }
      fetchUsers((currentPage - 1) * itemsPerPage, itemsPerPage);
      fetchUserStats();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const StatCard = ({ icon: Icon, title, count, description, color, bg }: any) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-900">{title}</div>
          <div className="text-2xl font-bold text-gray-900 leading-none">{count}</div>
        </div>
      </div>
      <div className="text-[10px] text-gray-500">{description}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="h-6 w-6 text-indigo-600" />
          User Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage user accounts and permissions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <StatCard 
          icon={Users} title="Total Users" count={userStats?.totalUsers || 0} 
          description="All registered users" color="text-indigo-600" bg="bg-indigo-50" 
        />
        <StatCard 
          icon={User} title="Recruiters" count={userStats?.recruiters || 0} 
          description="Recruiter accounts" color="text-blue-500" bg="bg-blue-50" 
        />
        <StatCard 
          icon={UserCheck} title="Team Leads" count={userStats?.teamLeads || 0} 
          description="Leading teams" color="text-green-500" bg="bg-green-50" 
        />
        <StatCard 
          icon={Briefcase} title="Managers" count={userStats?.managers || 0} 
          description="Recruitment managers" color="text-purple-600" bg="bg-purple-50" 
        />
        <StatCard 
          icon={Building} title="Business Development" count={userStats?.bdm || 0} 
          description="BDM users" color="text-orange-500" bg="bg-orange-50" 
        />
        <StatCard 
          icon={CheckCircle} title="Active Users" count={userStats?.activeUsers || 0} 
          description="Currently active" color="text-emerald-500" bg="bg-emerald-50" 
        />
        <StatCard 
          icon={XCircle} title="Inactive Users" count={userStats?.inactiveUsers || 0} 
          description="Disabled / inactive" color="text-red-500" bg="bg-red-50" 
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="flex gap-4 flex-1">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Role</span>
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All Roles">All Roles</option>
              <option value="admin">Admin</option>
              <option value="recruiter">Recruiter</option>
              <option value="team_lead">Team Lead</option>
              <option value="bdm">BDM</option>
              <option value="client_manager">Client Manager</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status</span>
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All Status">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <PermissionGuard module="users" action="create" mode="hide">
          <button
            onClick={() => navigate("/users/create")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </PermissionGuard>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">NAME</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ROLE</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">STATUS</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">CREATED</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">No users found.</td>
              </tr>
            ) : (
              users.map((user) => {
                const name = user.email.split('@')[0];
                const initial = name.charAt(0).toUpperCase();
                return (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                        {initial}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${RoleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {RoleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <PermissionGuard module="users" action="edit" mode="hide">
                          <button onClick={() => navigate(`/users/${user.id}/edit`)} className="text-indigo-600 hover:text-indigo-800 transition-colors" title="Edit User">
                            <Edit className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard module="users" action="edit" mode="hide">
                          <button onClick={() => handleToggleStatus(user.id, user.is_active)} className="text-orange-500 hover:text-orange-700 transition-colors" title={user.is_active ? "Disable User" : "Enable User"}>
                            <Ban className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard module="users" action="delete" mode="hide">
                          <button onClick={() => handleDelete(user.id, user.email)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete User">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, total)} to {Math.min(currentPage * itemsPerPage, total)} of {total} users
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-medium">
            {currentPage}
          </div>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <select 
            className="ml-4 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Action Legend */}
      <div className="mt-8 flex gap-8 border-t border-gray-200 pt-6">
        <div className="flex items-center gap-3">
          <Edit className="w-4 h-4 text-indigo-600" />
          <div>
            <div className="text-xs font-semibold text-gray-900">Edit User</div>
            <div className="text-[10px] text-gray-500">Update user details and role</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Ban className="w-4 h-4 text-orange-500" />
          <div>
            <div className="text-xs font-semibold text-gray-900">Disable User</div>
            <div className="text-[10px] text-gray-500">Disable user login access</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Trash2 className="w-4 h-4 text-red-500" />
          <div>
            <div className="text-xs font-semibold text-gray-900">Delete User</div>
            <div className="text-[10px] text-gray-500">Permanently remove user</div>
          </div>
        </div>
      </div>
    </div>
  );
}
