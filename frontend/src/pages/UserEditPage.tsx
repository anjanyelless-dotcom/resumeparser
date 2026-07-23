import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import toast from "react-hot-toast";
import { ArrowLeft, Save, User } from "lucide-react";
import api from "../services/api";
import { formatRoleName, filterInternalRoles } from "../utils/roles";

export default function UserEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { users, updateUserRole, activateUser, deactivateUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get("/permissions/roles");
        const filteredRoles = filterInternalRoles(res.data.roles || []);
        setRoles(filteredRoles);
      } catch (err) {
        console.error("Failed to load roles", err);
      }
    };
    fetchRoles();
  }, []);
  
  const [formData, setFormData] = useState({
    email: "",
    role: "recruiter",
    is_active: true,
  });

  useEffect(() => {
    if (id) {
      const user = users.find(u => u.id === id);
      if (user) {
        setFormData({
          email: user.email,
          role: user.role,
          is_active: user.is_active,
        });
      }
    }
  }, [id, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setLoading(true);
    try {
      // Update role if changed
      if (formData.role !== users.find(u => u.id === id)?.role) {
        await updateUserRole(id, formData.role);
        toast.success("User role updated successfully");
      }

      // Update active status if changed
      const currentStatus = users.find(u => u.id === id)?.is_active;
      if (formData.is_active !== currentStatus) {
        if (formData.is_active) {
          await activateUser(id);
          toast.success("User activated successfully");
        } else {
          await deactivateUser(id);
          toast.success("User deactivated successfully");
        }
      }

      navigate("/users");
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/users")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="h-8 w-8 text-purple-600" />
            Edit User
          </h1>
          <p className="mt-2 text-gray-600">Update user information and permissions</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={roles.length === 0}
              >
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {formatRoleName(role.name)}
                    </option>
                  ))
                ) : (
                  <option value="">Loading roles...</option>
                )}
              </select>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                {formData.is_active ? "User can log in and access the system" : "User account is disabled"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate("/users")}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
