import React from 'react';
import type { ModuleTree, RolePermission } from '../../store/usePermissionStore';
import { Eye, ShieldAlert } from 'lucide-react';

interface LiveSidebarPreviewProps {
  modules: ModuleTree[];
  draftPermissions: RolePermission[];
  isSuperAdmin: boolean;
}

export const LiveSidebarPreview: React.FC<LiveSidebarPreviewProps> = ({ 
  modules, 
  draftPermissions,
  isSuperAdmin
}) => {
  
  const isVisible = (moduleId: string) => {
    if (isSuperAdmin) return true;
    return draftPermissions.some(p => p.module_id === moduleId && p.sidebar_visible);
  };

  const renderNavItems = (moduleList: ModuleTree[], level: number = 0) => {
    return moduleList.map(module => {
      const visible = isVisible(module.id);
      if (!visible) return null;

      const hasChildren = module.children && module.children.length > 0;
      
      return (
        <div key={module.id} className="mb-1">
          <div className={`px-3 py-2 text-sm text-gray-300 rounded-md bg-gray-800 ${level > 0 ? 'ml-4 bg-gray-900 border-l border-gray-700' : 'font-medium'}`}>
            {module.display_name}
          </div>
          {hasChildren && (
            <div className="mt-1">
              {renderNavItems(module.children ?? [], level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="bg-[#111827] rounded-lg shadow-xl overflow-hidden flex flex-col h-[600px] border border-gray-700 sticky top-4">
      <div className="bg-[#1F2937] px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-200">Live Sidebar Preview</h3>
        </div>
        {isSuperAdmin && <ShieldAlert className="w-4 h-4 text-red-400" />}
      </div>
      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
        <div className="space-y-1">
          {renderNavItems(modules)}
        </div>
        {modules.every(m => !isVisible(m.id)) && !isSuperAdmin && (
           <div className="text-center text-gray-500 mt-10 text-sm">
             No menus visible
           </div>
        )}
      </div>
    </div>
  );
};
