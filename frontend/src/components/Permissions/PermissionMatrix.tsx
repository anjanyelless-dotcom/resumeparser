import React from 'react';
import type { Action, RbacModule, RolePermission, Scope } from '../../store/usePermissionStore';
import { CheckSquare, Square, ChevronDown, ChevronRight, MinusSquare } from 'lucide-react';

interface PermissionMatrixProps {
  modules: RbacModule[];
  actions: Action[];
  scopes: Scope[];
  draftPermissions: RolePermission[];
  onToggleAction: (moduleId: string, moduleNameKey: string, action: string, allowed: boolean) => void;
  onChangeScope: (moduleId: string, scopeId: string) => void;
  onSelectAllModule: (moduleId: string, moduleNameKey: string, allowed: boolean) => void;
  onToggleAllPermissions?: (allowed: boolean) => void;
  isSuperAdmin: boolean;
  searchQuery: string;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  modules,
  actions,
  scopes,
  draftPermissions,
  onToggleAction,
  onChangeScope,
  onSelectAllModule,
  onToggleAllPermissions,
  isSuperAdmin,
  searchQuery,
}) => {
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});

  // Global state calculation
  const totalPossiblePermissions = modules.length * actions.length;
  const currentAllowedCount = modules.reduce((count, mod) => {
    return count + actions.reduce((actCount, action) => {
      const perm = draftPermissions.find((p) => p.module_id === mod.id && p.action === action.name);
      return actCount + (perm?.allowed ? 1 : 0);
    }, 0);
  }, 0);

  const isGlobalAllChecked = totalPossiblePermissions > 0 && currentAllowedCount === totalPossiblePermissions;
  const isGlobalIndeterminate = currentAllowedCount > 0 && currentAllowedCount < totalPossiblePermissions;

  const handleToggleGlobal = () => {
    if (isSuperAdmin || !onToggleAllPermissions) return;
    onToggleAllPermissions(!isGlobalAllChecked);
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggleGlobal();
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getPermission = (moduleId: string, action: string) =>
    draftPermissions.find((p) => p.module_id === moduleId && p.action === action);

  const isAllowed = (moduleId: string, action: string): boolean => {
    if (isSuperAdmin) return true;
    return getPermission(moduleId, action)?.allowed || false;
  };

  const getScopeId = (moduleId: string): string => {
    const perm = draftPermissions.find((p) => p.module_id === moduleId && p.action === 'view');
    return perm?.scope_id || '';
  };

  // Group modules by category
  const grouped: Record<string, RbacModule[]> = {};
  modules.forEach((m) => {
    const cat = m.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  });

  // Filter by search
  const filteredGrouped: Record<string, RbacModule[]> = {};
  Object.entries(grouped).forEach(([cat, mods]) => {
    const filtered = mods.filter((m) =>
      m.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) filteredGrouped[cat] = filtered;
  });

  if (Object.keys(filteredGrouped).length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center text-sm text-gray-500">
        No modules match "{searchQuery}"
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Module Permission Matrix</h3>
          <p className="text-xs text-gray-500 mt-0.5">Columns loaded dynamically from the database</p>
        </div>
        
        {onToggleAllPermissions && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-medium">Select All</span>
            <div
              className={`flex items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm ${isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleToggleGlobal}
              onKeyDown={handleGlobalKeyDown}
              role="checkbox"
              tabIndex={0}
              aria-checked={isGlobalIndeterminate ? 'mixed' : isGlobalAllChecked}
              aria-label="Select all permissions"
            >
              {isGlobalAllChecked && <CheckSquare className="w-5 h-5 text-indigo-600" />}
              {!isGlobalAllChecked && !isGlobalIndeterminate && <Square className="w-5 h-5 text-gray-300" />}
              {isGlobalIndeterminate && <MinusSquare className="w-5 h-5 text-indigo-400" />}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">
                Module
              </th>
              {actions.map((action) => (
                <th
                  key={action.id}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                  title={action.display_name}
                >
                  {action.display_name}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                Scope
              </th>
              <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                All
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {Object.entries(filteredGrouped).map(([category, mods]) => {
              const isCollapsed = collapsedCategories[category];
              return (
                <React.Fragment key={category}>
                  {/* Category header row */}
                  <tr
                    className="bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <td
                      colSpan={actions.length + 3}
                      className="px-4 py-2 font-semibold text-xs text-gray-600 uppercase tracking-wider"
                    >
                      <div className="flex items-center space-x-1">
                        {isCollapsed
                          ? <ChevronRight className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{category}</span>
                        <span className="text-gray-400 font-normal">({mods.length})</span>
                      </div>
                    </td>
                  </tr>

                  {!isCollapsed && mods.map((mod) => {
                    const viewAllowed = isAllowed(mod.id, 'view');
                    const currentScopeId = getScopeId(mod.id);

                    // Module Select All calculation
                    let allowedActionCount = 0;
                    actions.forEach(action => {
                      if (isAllowed(mod.id, action.name)) allowedActionCount++;
                    });
                    const isModuleAllChecked = actions.length > 0 && allowedActionCount === actions.length;
                    const isModuleIndeterminate = allowedActionCount > 0 && allowedActionCount < actions.length;

                    const handleToggleModule = () => {
                      if (isSuperAdmin) return;
                      onSelectAllModule(mod.id, mod.name, !isModuleAllChecked);
                    };

                    return (
                      <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800 text-sm">
                          {mod.display_name}
                        </td>

                        {actions.map((action) => {
                          const allowed = isAllowed(mod.id, action.name);
                          const isViewAction = action.name === 'view';
                          const disabled = isSuperAdmin || (!isViewAction && !viewAllowed);

                          return (
                            <td key={action.id} className="px-2 py-3 text-center">
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onToggleAction(mod.id, mod.name, action.name, !allowed)}
                                className="inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110 transition-transform"
                                title={`${action.display_name}: ${allowed ? 'Allowed' : 'Denied'}`}
                              >
                                {allowed
                                  ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  : <Square className="w-4 h-4 text-gray-300" />
                                }
                              </button>
                            </td>
                          );
                        })}

                        {/* Scope per module */}
                        <td className="px-4 py-3">
                          <select
                            value={currentScopeId}
                            disabled={isSuperAdmin || !viewAllowed}
                            onChange={(e) => onChangeScope(mod.id, e.target.value)}
                            className="block w-full pl-2 pr-6 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:opacity-50"
                          >
                            <option value="">Default</option>
                            {scopes.map((scope) => (
                              <option key={scope.id} value={scope.id}>{scope.display_name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Select All for this module */}
                        <td className="px-2 py-3 text-center">
                          <div
                            className={`inline-flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm ${isSuperAdmin ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}
                            onClick={handleToggleModule}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                handleToggleModule();
                              }
                            }}
                            role="checkbox"
                            tabIndex={isSuperAdmin ? -1 : 0}
                            aria-checked={isModuleIndeterminate ? 'mixed' : isModuleAllChecked}
                            aria-label={`Select all permissions for ${mod.display_name}`}
                            title={`Select all permissions for ${mod.display_name}`}
                          >
                            {isModuleAllChecked && <CheckSquare className="w-4 h-4 text-indigo-600" />}
                            {!isModuleAllChecked && !isModuleIndeterminate && <Square className="w-4 h-4 text-gray-300" />}
                            {isModuleIndeterminate && <MinusSquare className="w-4 h-4 text-indigo-400" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
