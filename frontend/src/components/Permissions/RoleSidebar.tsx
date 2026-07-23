import React from 'react';
import { usePermissionStore, type Role } from '../../store/usePermissionStore';
import { Shield, ShieldCheck, ShieldAlert, User, Crown, Briefcase } from 'lucide-react';

interface RoleSidebarProps {
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
}

const getRoleIcon = (roleName: string, isSystem?: boolean) => {
  const name = roleName.toLowerCase();
  if (isSystem && (name === 'admin' || name === 'super admin')) return <ShieldAlert className="w-4 h-4 text-red-500" />;
  if (name === 'admin' || name === 'super admin') return <ShieldCheck className="w-4 h-4 text-blue-500" />;
  if (name === 'manager' || name === 'team lead') return <Crown className="w-4 h-4 text-purple-500" />;
  if (name === 'recruiter') return <User className="w-4 h-4 text-green-500" />;
  if (name === 'bdm' || name === 'client manager') return <Briefcase className="w-4 h-4 text-amber-500" />;
  return <Shield className="w-4 h-4 text-gray-500" />;
};

export const RoleSidebar: React.FC<RoleSidebarProps> = ({ selectedRoleId, onSelectRole }) => {
  const { roles, isLoading } = usePermissionStore();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Roles</h2>
        <p className="text-xs text-gray-500 mt-1">Select a role to configure</p>
      </div>

      {isLoading && roles.length === 0 ? (
        <div className="p-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <ul className="py-2 flex-1">
          {roles.map((role: Role) => (
            <li key={role.id}>
              <button
                onClick={() => onSelectRole(role.id)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors ${
                  selectedRoleId === role.id
                    ? 'bg-indigo-50 border-r-4 border-indigo-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                {getRoleIcon(role.name, role.is_system)}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${selectedRoleId === role.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {role.name}
                  </div>
                  <div className="flex items-center space-x-1 mt-0.5">
                    {role.is_system && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        System
                      </span>
                    )}
                    {role.user_count !== undefined && (
                      <span className="text-xs text-gray-400">{role.user_count} users</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
