import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, RefreshCw, CheckSquare, Square } from "lucide-react";
import { usePermissionStore } from "../store/usePermissionStore";
import api from "../services/api";

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface Permission {
  id: string;
  module_name?: string;
  module?: string;
  action_name?: string;
  name?: string;
  description?: string;
}

interface RolePermission {
  permissionId: string;
  moduleId: string;
  actionId: string;
}

export default function PermissionManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { fetchAllPermissions } = usePermissionStore();

  // Module and action mappings for display
  const moduleDisplayNames: Record<string, string> = {
    user: "Users",
    candidate: "Candidates", 
    job: "Jobs",
    labeling: "Labeling",
    matching: "Matching",
    settings: "Settings",
    analytics: "Analytics"
  };

  const actionDisplayNames: Record<string, string> = {
    view: "View",
    create: "Create",
    edit: "Edit", 
    delete: "Delete",
    approve: "Approve",
    view_stats: "View Stats"
  };

  // Fetch roles and permissions on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all permissions
      await fetchAllPermissions();
      
      // Fetch all roles
      const rolesResponse = await api.get("/permissions/roles");
      setRoles(rolesResponse.data.roles || []);
      
      // Get permissions catalog
      const permissionsResponse = await api.get("/permissions");
      setAllPermissions(permissionsResponse.data.permissions || []);
      
      // Select first role by default
      if (rolesResponse.data.roles?.length > 0) {
        const firstRole = rolesResponse.data.roles[0];
        setSelectedRoleId(firstRole.id);
        await fetchRolePermissions(firstRole.id);
      }
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load permissions data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await api.get(`/permissions/role-permissions/${roleId}`);
      const permissions = response.data.permissions || [];
      
      // Convert to RolePermission format
      const rolePerms: RolePermission[] = permissions.map((perm: any) => ({
        permissionId: perm.id,
        moduleId: perm.module_name || perm.module || '',
        actionId: perm.action_name || perm.name || ''
      }));
      
      setRolePermissions(rolePerms);
    } catch (error: any) {
      console.error("Failed to fetch role permissions:", error);
      toast.error("Failed to load role permissions");
    }
  };

  const handleRoleChange = async (roleId: string) => {
    setSelectedRoleId(roleId);
    await fetchRolePermissions(roleId);
  };

  const handlePermissionToggle = (moduleId: string, actionId: string) => {
    const existingIndex = rolePermissions.findIndex(
      rp => rp.moduleId === moduleId && rp.actionId === actionId
    );

    if (existingIndex >= 0) {
      // Remove permission
      setRolePermissions(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Add permission
      const permission = allPermissions.find(p => {
        const moduleName = p.module_name || p.module;
        if (!moduleName || moduleName !== moduleId) return false;
        
        const actionName = p.action_name || p.name;
        if (!actionName || actionName !== actionId) return false;
        
        return true;
      });
      if (permission) {
        setRolePermissions(prev => [...prev, {
          permissionId: permission.id,
          moduleId,
          actionId
        }]);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      toast.error("Please select a role");
      return;
    }

    setIsSaving(true);
    try {
      const permissionIds = rolePermissions.map(rp => rp.permissionId);
      
      await api.put(`/permissions/role-permissions/${selectedRoleId}`, {
        permissionIds
      });

      toast.success("Permissions saved successfully");
    } catch (error: any) {
      console.error("Failed to save permissions:", error);
      toast.error(error.response?.data?.message || "Failed to save permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const isPermissionSelected = (moduleId: string, actionId: string) => {
    return rolePermissions.some(rp => rp.moduleId === moduleId && rp.actionId === actionId);
  };

  // Group permissions by module
  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    const moduleName = permission.module_name || permission.module;
    if (!moduleName) return acc;
    
    if (!acc[moduleName]) {
      acc[moduleName] = [];
    }
    acc[moduleName].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Get all unique actions across modules
  const allActions = Array.from(
    new Set(allPermissions.map(p => p.action_name || p.name).filter(Boolean))
  ).sort();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-gray-600">Loading permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Permission Management</h1>
            <p className="text-gray-500 mt-1">
              Manage role-based access control for system modules and actions
            </p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <label htmlFor="role-select" className="text-sm font-medium text-gray-700">
              Select Role:
            </label>
            <select
              id="role-select"
              value={selectedRoleId}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Permission Matrix</h2>
            <p className="text-sm text-gray-500">
              Check the boxes to grant permissions. Uncheck to remove permissions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  {allActions.map((action) => (
                    <th key={action} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {actionDisplayNames[action as string] || action}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(groupedPermissions).map(([moduleId, permissions]) => (
                  <tr key={moduleId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {moduleDisplayNames[moduleId as string] || moduleId}
                    </td>
                    {allActions.map((action:any) => {
                      const isSelected = isPermissionSelected(moduleId, action);
                      const hasPermission = permissions.some(p => {
                        const moduleName = p.module_name || p.module;
                        if (!moduleName || moduleName !== moduleId) return false;
                        
                        const actionName = p.action_name || p.name;
                        if (!actionName) return false;
                        return actionName === action;
                      });
                      
                      return (
                        <td key={action} className="px-6 py-4 whitespace-nowrap text-center">
                          {hasPermission ? (
                            <button
                              onClick={() => handlePermissionToggle(moduleId, action)}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <div className="w-5 h-5" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedRoleId}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Permissions
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}