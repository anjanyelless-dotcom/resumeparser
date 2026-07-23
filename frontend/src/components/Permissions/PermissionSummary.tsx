import React from 'react';
import type { Role, RolePermission, SidebarPermission } from '../../store/usePermissionStore';
import { Shield, ShieldAlert, Users, Clock, GitBranch, CheckCircle } from 'lucide-react';

interface PermissionSummaryProps {
  role: Role | null;
  draftPermissions: RolePermission[];
  draftSidebarPermissions: SidebarPermission[];
  isSuperAdmin: boolean;
}

export const PermissionSummary: React.FC<PermissionSummaryProps> = ({
  role,
  draftPermissions,
  draftSidebarPermissions,
  isSuperAdmin,
}) => {
  if (isSuperAdmin) {
    return (
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-medium text-indigo-800">System Administrator — Unrestricted Access</h3>
        </div>
        <p className="mt-1 text-sm text-indigo-600">
          This is a system role with unrestricted access to all modules and actions. Core permissions cannot be removed.
        </p>
      </div>
    );
  }

  const allowedCount = draftPermissions.filter((p) => p.allowed).length;
  const sidebarCount = draftSidebarPermissions.filter((p) => p.visible).length;

  return (
    <div className="space-y-4 mb-6">
      {/* Role Info Card */}
      {role && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  {role.is_system && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      System
                    </span>
                  )}
                  {role.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      role.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {role.status}
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                )}
              </div>
            </div>
            {role.version !== undefined && (
              <div className="flex items-center text-xs text-gray-400 space-x-1">
                <GitBranch className="w-3 h-3" />
                <span>v{role.version}</span>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Users</p>
                <p className="text-sm font-semibold text-gray-800">{role.user_count ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-500">Allowed Actions</p>
                <p className="text-sm font-semibold text-gray-800">{allowedCount}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs text-gray-500">Visible Menus</p>
                <p className="text-sm font-semibold text-gray-800">{sidebarCount}</p>
              </div>
            </div>
            {role.updated_at && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-xs font-medium text-gray-700">
                    {new Date(role.updated_at).toLocaleDateString()}
                    {role.updated_by_name && ` by ${role.updated_by_name}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
