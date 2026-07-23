import React from 'react';
import type { SidebarPermission } from '../../store/usePermissionStore';
import { ChevronRight, ChevronDown, CheckSquare, Square, MinusSquare } from 'lucide-react';

interface SidebarTreeConfigProps {
  sidebarPermissions: SidebarPermission[];
  onToggleSidebar: (sidebarModuleId: string, visible: boolean, childIds: string[]) => void;
  onToggleAllSidebar?: (visible: boolean) => void;
  isSuperAdmin: boolean;
}

export const SidebarTreeConfig: React.FC<SidebarTreeConfigProps> = ({
  sidebarPermissions,
  onToggleSidebar,
  onToggleAllSidebar,
  isSuperAdmin,
}) => {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  // Global state calculation
  const totalItems = sidebarPermissions.length;
  const visibleItems = sidebarPermissions.filter(sp => sp.visible).length;
  const isAllChecked = totalItems > 0 && visibleItems === totalItems;
  const isIndeterminate = visibleItems > 0 && visibleItems < totalItems;

  const handleToggleGlobal = () => {
    if (isSuperAdmin || !onToggleAllSidebar) return;
    onToggleAllSidebar(!isAllChecked);
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggleGlobal();
    }
  };

  // Build tree from flat list
  const buildTree = (items: SidebarPermission[], parentId: string | null = null): SidebarPermission[] => {
    return items
      .filter((i) => (i.parent_id || null) === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const getChildIds = (parentId: string): string[] => {
    return sidebarPermissions
      .filter((sp) => sp.parent_id === parentId)
      .map((sp) => sp.sidebar_module_id);
  };

  const getVisibilityState = (item: SidebarPermission): 'checked' | 'unchecked' | 'indeterminate' => {
    if (isSuperAdmin) return 'checked';
    const childIds = getChildIds(item.sidebar_module_id);
    if (childIds.length === 0) return item.visible ? 'checked' : 'unchecked';

    const visibleChildren = childIds.filter((cid) => {
      const child = sidebarPermissions.find((sp) => sp.sidebar_module_id === cid);
      return child?.visible;
    }).length;

    if (item.visible && visibleChildren === childIds.length) return 'checked';
    if (item.visible || visibleChildren > 0) return 'indeterminate';
    return 'unchecked';
  };

  const handleToggle = (item: SidebarPermission) => {
    if (isSuperAdmin) return;
    const state = getVisibilityState(item);
    const newVis = state !== 'checked';
    const childIds = getChildIds(item.sidebar_module_id);
    onToggleSidebar(item.sidebar_module_id, newVis, childIds);
  };

  const roots = buildTree(sidebarPermissions);

  const renderItem = (item: SidebarPermission, level: number = 0): React.ReactNode => {
    const children = buildTree(sidebarPermissions, item.sidebar_module_id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded[item.sidebar_module_id] ?? true;
    const visState = getVisibilityState(item);

    return (
      <div key={item.sidebar_module_id} className="select-none">
        <div
          className={`flex items-center py-2 px-2 hover:bg-gray-50 rounded-md transition-colors ${level > 0 ? 'ml-6' : ''}`}
        >
          {/* Expand toggle */}
          <div
            className="w-5 flex items-center justify-center cursor-pointer"
            onClick={() => hasChildren && setExpanded((p) => ({ ...p, [item.sidebar_module_id]: !isExpanded }))}
          >
            {hasChildren && (isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />)}
          </div>

          {/* Checkbox */}
          <div
            className="flex items-center cursor-pointer mr-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
            onClick={() => handleToggle(item)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleToggle(item);
              }
            }}
            role="checkbox"
            tabIndex={0}
            aria-checked={visState === 'indeterminate' ? 'mixed' : visState === 'checked'}
            aria-label={`Select ${item.display_name}`}
          >
            {visState === 'checked' && <CheckSquare className="w-4 h-4 text-indigo-600" />}
            {visState === 'unchecked' && <Square className="w-4 h-4 text-gray-300" />}
            {visState === 'indeterminate' && <MinusSquare className="w-4 h-4 text-indigo-400" />}
          </div>

          <span className={`text-sm ${level === 0 ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'}`}>
            {item.display_name}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {children.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Sidebar Visibility</h2>
        
        {onToggleAllSidebar && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-medium">Select All</span>
            <div
              className={`flex items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm ${isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleToggleGlobal}
              onKeyDown={handleGlobalKeyDown}
              role="checkbox"
              tabIndex={0}
              aria-checked={isIndeterminate ? 'mixed' : isAllChecked}
              aria-label="Select all sidebar items"
            >
              {isAllChecked && <CheckSquare className="w-5 h-5 text-indigo-600" />}
              {!isAllChecked && !isIndeterminate && <Square className="w-5 h-5 text-gray-300" />}
              {isIndeterminate && <MinusSquare className="w-5 h-5 text-indigo-400" />}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 overflow-y-auto max-h-[500px]">
        {roots.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No sidebar menus configured</p>
        ) : (
          roots.map((item) => renderItem(item))
        )}
      </div>
    </div>
  );
};
