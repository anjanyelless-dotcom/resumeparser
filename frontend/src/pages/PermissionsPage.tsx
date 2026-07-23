import { useEffect, useState } from "react";
import { usePermissionStore } from "../store/usePermissionStore";
import toast from "react-hot-toast";
import { Shield, Check, X } from "lucide-react";

export default function PermissionsPage() {
  const { permissions, roles, rolePermissions, isLoading, error, fetchPermissions, fetchRoles, fetchRolePermissions, updateRolePermissions } = usePermissionStore();
  const [selectedRole, setSelectedRole] = useState<string>("recruiter");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  useEffect(() => {
    const currentPermissions = rolePermissions[selectedRole] || [];
    setSelectedPermissions(currentPermissions.map((p) => p.name));
  }, [rolePermissions, selectedRole]);

  const handlePermissionToggle = (permissionName: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionName)
        ? prev.filter((p) => p !== permissionName)
        : [...prev, permissionName]
    );
  };

  const handleSave = async () => {
    try {
      await updateRolePermissions(selectedRole, selectedPermissions);
      toast.success("Permissions updated successfully");
    } catch (error) {
      toast.error("Failed to update permissions");
    }
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const modules = Object.keys(groupedPermissions).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            Permission Matrix
          </h1>
          <p className="mt-2 text-gray-600">Manage role permissions and access control</p>
        </div>

        {/* Role Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role
          </label>
          <div className="flex gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedRole === role
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Permission Matrix */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {modules.map((module) => (
                <div key={module} className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                    {module}
                  </h3>
                  <div className="space-y-3">
                    {groupedPermissions[module].map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {permission.name}
                          </div>
                          {permission.description && (
                            <div className="text-sm text-gray-500">
                              {permission.description}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handlePermissionToggle(permission.name)}
                          disabled={selectedRole === "admin"}
                          className={`p-2 rounded-full transition-colors ${
                            selectedPermissions.includes(permission.name)
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                          } ${selectedRole === "admin" ? "cursor-not-allowed opacity-50" : ""}`}
                          title={
                            selectedRole === "admin"
                              ? "Admin has all permissions"
                              : selectedPermissions.includes(permission.name)
                              ? "Revoke permission"
                              : "Grant permission"
                          }
                        >
                          {selectedPermissions.includes(permission.name) ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <X className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={selectedRole === "admin" || isLoading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Legend</h4>
          <div className="flex gap-6 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Permission granted</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-gray-400" />
              <span>Permission not granted</span>
            </div>
            <div className="text-gray-600">
              Note: Admin role has all permissions by default
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
