import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, RefreshCw, Eye, X, Shield, ChevronDown, LayoutDashboard, Users, Upload, Briefcase, FileText, Send, Zap, Crosshair, Building, GitMerge, BarChart, Search, Calendar, Settings } from "lucide-react";
import { usePermissionStore } from "../store/usePermissionStore";
import { formatRoleName, filterInternalRoles } from "../utils/roles";

export default function PermissionManagementPage() {
  const {
    roles,
    actions,
    rbacModules,
    sidebarModules,
    scopes,
    activeRole,
    activeModulePermissions,
    activeSidebarPermissions,
    fetchPermissionCatalog,
    fetchEnterpriseRoleConfig,
    saveEnterpriseRoleConfig,
    isLoading
  } = usePermissionStore();

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Local state for edits
  const [localSidebarAccess, setLocalSidebarAccess] = useState<Record<string, boolean>>({});
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({});
  const [dataScope, setDataScope] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await fetchPermissionCatalog();
    } catch (error) {
      toast.error("Failed to load permissions data");
    }
  };

  useEffect(() => {
    const internalRoles = filterInternalRoles(roles);
    if (internalRoles.length > 0 && !selectedRoleId) {
      handleRoleChange(internalRoles[0].id);
    }
  }, [roles]);

  const handleRoleChange = async (roleId: string) => {
    setSelectedRoleId(roleId);
    try {
      await fetchEnterpriseRoleConfig(roleId);
    } catch (error) {
      toast.error("Failed to load role permissions");
    }
  };

  useEffect(() => {
    if (activeRole) {
      setDataScope(activeRole.default_scope || scopes[0]?.id || 'assigned');

      const newSidebarAccess: Record<string, boolean> = {};
      activeSidebarPermissions.forEach((sp: any) => {
        newSidebarAccess[sp] = true;
      });
      setLocalSidebarAccess(newSidebarAccess);

      const newPerms: Record<string, boolean> = {};
      activeModulePermissions.forEach((rp: any) => {
        if (rp.allowed) {
          newPerms[`${rp.module_id}_${rp.action_id}`] = true;
        }
      });
      setLocalPermissions(newPerms);
    }
  }, [activeRole, activeModulePermissions, activeSidebarPermissions, scopes]);

  const handlePermissionToggle = (moduleId: string, actionId: string) => {
    setLocalPermissions(prev => ({
      ...prev,
      [`${moduleId}_${actionId}`]: !prev[`${moduleId}_${actionId}`]
    }));
  };

  const handleSidebarToggle = (moduleId: string) => {
    const module = sidebarModules.find(m => m.id === moduleId);
    if (!module) return;

    setLocalSidebarAccess(prev => {
      const next = { ...prev };
      const nextValue = !next[moduleId];
      next[moduleId] = nextValue;

      // If it's a parent, toggle all children
      if (!module.parent_id) {
        const children = sidebarModules.filter(m => m.parent_id === module.id);
        children.forEach(c => {
          next[c.id] = nextValue;
        });
      } else {
        // If it's a child being checked, ensure parent is checked too
        if (nextValue) {
          next[module.parent_id] = true;
        } else {
          // If unchecking child, and no other children are checked, maybe uncheck parent?
          // Keeping it simple: don't auto-uncheck parent.
        }
      }
      return next;
    });
  };

  const handleToggleAllSidebar = (selectAll: boolean) => {
    setLocalSidebarAccess(prev => {
      const next = { ...prev };
      sidebarModules.forEach(sm => {
        next[sm.id] = selectAll;
      });
      return next;
    });
  };

  const handleToggleAllPermissions = (selectAll: boolean) => {
    setLocalPermissions(prev => {
      const next = { ...prev };
      Object.values(moduleGroups).flat().forEach(module => {
        actions.forEach(action => {
          next[`${module.id}_${action.name.toLowerCase()}`] = selectAll;
        });
      });
      return next;
    });
  };

  const handleToggleModulePermissions = (moduleId: string, selectAll: boolean) => {
    setLocalPermissions(prev => {
      const next = { ...prev };
      actions.forEach(action => {
        next[`${moduleId}_${action.name.toLowerCase()}`] = selectAll;
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;

    setIsSaving(true);
    try {
      // Format payload
      const sidebar_permissions = Object.keys(localSidebarAccess)
        .filter(k => localSidebarAccess[k])
        .map(k => ({ sidebar_module_id: k, visible: true }));

      const module_permissions = Object.keys(localPermissions)
        .filter(k => localPermissions[k])
        .map(key => {
          const [module_id, action] = key.split('_');
          return { module_id, action, allowed: true } as any;
        });

      await saveEnterpriseRoleConfig(selectedRoleId, {
        sidebar_permissions,
        default_scope: dataScope,
        module_permissions
      });

      toast.success("Role configuration saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRoles = filterInternalRoles(roles);

  if (isLoading && !roles.length) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600">Loading Enterprise RBAC...</span>
        </div>
      </div>
    );
  }

  // Group permissions by Sidebar Parent, ONLY including modules that have their corresponding sidebar item checked
  const sidebarParents = sidebarModules.filter(sm => !sm.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  const moduleGroups: Record<string, typeof rbacModules> = {};
  sidebarParents.forEach(parent => {
    const children = sidebarModules.filter(sm => sm.parent_id === parent.id && localSidebarAccess[sm.id]);
    const childRbacModules = rbacModules.filter(rm => children.some(c => c.name === rm.name));

    if (childRbacModules.length > 0) {
      moduleGroups[parent.display_name] = childRbacModules;
    } else if (localSidebarAccess[parent.id]) {
      // If it's a top level module with no children
      const parentRbacModule = rbacModules.find(rm => rm.name === parent.name);
      if (parentRbacModule) {
        moduleGroups[parent.display_name] = [parentRbacModule];
      }
    }
  });

  // Filter actions to the required generic set
  const genericActionNames = new Set(['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export', 'import']);
  const filteredActions = actions.filter(a => genericActionNames.has(a.name.toLowerCase()));

  // Helper for icons
  const getIcon = (iconId: string | null | undefined) => {
    switch (iconId) {
      case 'dashboard': return <LayoutDashboard className="h-4 w-4" />;
      case 'users': return <Users className="h-4 w-4" />;
      case 'upload': return <Upload className="h-4 w-4" />;
      case 'briefcase': return <Briefcase className="h-4 w-4" />;
      case 'file-text': return <FileText className="h-4 w-4" />;
      case 'send': return <Send className="h-4 w-4" />;
      case 'zap': return <Zap className="h-4 w-4" />;
      case 'crosshair': return <Crosshair className="h-4 w-4" />;
      case 'building': return <Building className="h-4 w-4" />;
      case 'git-merge': return <GitMerge className="h-4 w-4" />;
      case 'bar-chart': return <BarChart className="h-4 w-4" />;
      case 'search': return <Search className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'settings': return <Settings className="h-4 w-4" />;
      case 'settings-users': return <Shield className="h-4 w-4" />;
      default: return <LayoutDashboard className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Role & Permission Management</h1>
            <p className="text-gray-500 mt-1">Enterprise RBAC configuration for access control</p>
          </div>
          <div>
            <button
              onClick={() => setShowPreview(true)}
              disabled={!selectedRoleId}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Eye className="h-4 w-4 mr-2 text-gray-500" />
              Preview Sidebar
            </button>
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Select Role:</label>
          <select
            value={selectedRoleId}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="block w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {filteredRoles.map(role => (
              <option key={role.id} value={role.id}>{formatRoleName(role.name)}</option>
            ))}
          </select>
          {activeRole && (
            <span className="ml-4 text-sm text-gray-500 border-l pl-4 border-gray-200">
              {activeRole.description}
            </span>
          )}
        </div>

        {/* Sidebar Access (Navigation) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">1. Sidebar Access (Navigation)</h2>

            {/* Global Sidebar Select All Checkbox */}
            {(() => {
              const totalItems = sidebarModules.length;
              const checkedItems = Object.keys(localSidebarAccess).filter(k => localSidebarAccess[k]).length;
              const isAllChecked = totalItems > 0 && checkedItems === totalItems;
              const isIndeterminate = checkedItems > 0 && checkedItems < totalItems;

              return (
                <label className="flex items-center space-x-2 cursor-pointer outline-none focus-within:ring-2 focus-within:ring-indigo-500 rounded-sm">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Select All</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    checked={isAllChecked}
                    ref={input => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={() => handleToggleAllSidebar(!isAllChecked)}
                    aria-label="Select all sidebar items"
                  />
                </label>
              );
            })()}
          </div>
          <p className="text-sm text-gray-500 mb-6">Select which functional modules are visible in the sidebar. Selecting a parent automatically selects all children.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sidebarParents.map(parent => {
              const children = sidebarModules.filter(sm => sm.parent_id === parent.id).sort((a, b) => a.sort_order - b.sort_order);
              const isChecked = !!localSidebarAccess[parent.id];
              const childrenCheckedCount = children.filter(c => localSidebarAccess[c.id]).length;

              let isIndeterminate = false;
              if (children.length > 0 && childrenCheckedCount > 0 && childrenCheckedCount < children.length) {
                isIndeterminate = true;
              }

              return (
                <div key={parent.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <label className="flex items-center space-x-3 cursor-pointer mb-2 font-medium text-gray-900">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      ref={input => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={() => handleSidebarToggle(parent.id)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{getIcon(parent.icon_id)}</span>
                      <span>{parent.display_name}</span>
                    </div>
                  </label>

                  {children.length > 0 && (
                    <div className="pl-7 space-y-2 mt-2 border-l-2 border-gray-100 ml-2">
                      {children.map(child => (
                        <label key={child.id} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            id={`sidebar_${child.id}`}
                            name={`sidebar_${child.id}`}
                            checked={!!localSidebarAccess[child.id]}
                            onChange={() => handleSidebarToggle(child.id)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            aria-label={`Toggle access for ${child.display_name}`}
                          />
                          <span className="text-sm text-gray-600">{child.display_name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">2. Module Permissions</h2>

            {/* Global Matrix Select All Checkbox */}
            {Object.keys(moduleGroups).length > 0 && (() => {
              const visibleModules = Object.values(moduleGroups).flat();
              const totalPossible = visibleModules.length * filteredActions.length;
              let currentAllowed = 0;
              visibleModules.forEach(m => {
                filteredActions.forEach(a => {
                  if (localPermissions[`${m.id}_${a.id}`]) currentAllowed++;
                });
              });
              const isAllChecked = totalPossible > 0 && currentAllowed === totalPossible;
              const isIndeterminate = currentAllowed > 0 && currentAllowed < totalPossible;

              return (
                <label className="flex items-center space-x-2 cursor-pointer outline-none focus-within:ring-2 focus-within:ring-indigo-500 rounded-sm">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Select All</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    checked={isAllChecked}
                    ref={input => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={() => handleToggleAllPermissions(!isAllChecked)}
                    aria-label="Select all permissions"
                  />
                </label>
              );
            })()}
          </div>
          <p className="text-sm text-gray-500 mb-6">Map exact CRUD actions to system modules. Modules removed from Sidebar Access are not shown here.</p>

          {Object.keys(moduleGroups).length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <Shield className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">No modules selected</h3>
              <p className="text-sm text-gray-500 mt-1">Select modules in the Sidebar Access section above to configure their permissions.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  {filteredActions.map(action => (
                    <th key={action.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      {action.display_name}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200">
                    All
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(moduleGroups).map(([group, modules]) => (
                  <React.Fragment key={group}>
                    <tr className="bg-gray-100/50">
                      <td colSpan={filteredActions.length + 2} className="px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {group}
                      </td>
                    </tr>
                    {modules.map(module => (
                      <tr key={module.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-100">
                          {module.display_name}
                        </td>
                        {filteredActions.map(action => (
                          <td key={action.id} className="px-3 py-4 text-center border-r border-gray-100 last:border-0">
                            <input
                              type="checkbox"
                              id={`perm_${module.id}_${action.name.toLowerCase()}`}
                              name={`perm_${module.id}_${action.name.toLowerCase()}`}
                              checked={!!localPermissions[`${module.id}_${action.name.toLowerCase()}`]}
                              onChange={() => handlePermissionToggle(module.id, action.name.toLowerCase())}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                              aria-label={`Permission ${action.display_name} for ${module.display_name}`}
                            />
                          </td>
                        ))}
                        {/* Select All for Module Checkbox */}
                        {(() => {
                          let currentAllowed = 0;
                          filteredActions.forEach(a => {
                            if (localPermissions[`${module.id}_${a.name.toLowerCase()}`]) currentAllowed++;
                          });
                          const isModuleAllChecked = filteredActions.length > 0 && currentAllowed === filteredActions.length;
                          const isModuleIndeterminate = currentAllowed > 0 && currentAllowed < filteredActions.length;

                          return (
                            <td className="px-3 py-4 text-center border-l border-gray-200">
                              <input
                                type="checkbox"
                                id={`perm_all_${module.id}`}
                                name={`perm_all_${module.id}`}
                                checked={isModuleAllChecked}
                                ref={input => {
                                  if (input) input.indeterminate = isModuleIndeterminate;
                                }}
                                onChange={() => handleToggleModulePermissions(module.id, !isModuleAllChecked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                aria-label={`Select all permissions for ${module.display_name}`}
                                title={`Select all for ${module.display_name}`}
                              />
                            </td>
                          );
                        })()}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Data Scope */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Data Scope</h2>
          <p className="text-sm text-gray-500 mb-6">Determine the row-level visibility scope for this role.</p>

          <div className="flex flex-col space-y-3">
            {scopes
              .filter(s => ['own', 'assigned', 'team', 'department', 'organization'].includes(s.name.toLowerCase()))
              .map(scope => {
                const displayNameMap: Record<string, string> = {
                  'own': 'Own Data',
                  'assigned': 'Assigned Data',
                  'team': 'Team Data',
                  'department': 'Department Data',
                  'organization': 'Organization Data'
                };
                const display = displayNameMap[scope.name.toLowerCase()] || scope.display_name;

                return (
                  <label key={scope.id} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="data_scope"
                      value={scope.id}
                      checked={dataScope === scope.id}
                      onChange={(e) => setDataScope(e.target.value)}
                      className="w-4 h-4 mt-0.5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-gray-900">{display}</span>
                    </div>
                  </label>
                );
              })}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedRoleId}
            className={`inline-flex items-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors ${isSaving || !selectedRoleId ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
          >
            {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Role Sidebar Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={() => setShowPreview(false)} />
          <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Preview: {formatRoleName(activeRole?.name || '')}</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {sidebarParents.filter(p => localSidebarAccess[p.id]).map(parent => {
                const children = sidebarModules
                  .filter(sm => sm.parent_id === parent.id && localSidebarAccess[sm.id])
                  .sort((a, b) => a.sort_order - b.sort_order);

                if (children.length === 0 && !parent.route) return null; // Hide empty parents

                return (
                  <div key={parent.id} className="mb-1">
                    {children.length > 0 ? (
                      <>
                        <div className="w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-50">
                          <div className="flex items-center">
                            <span className="mr-3 text-gray-400">{getIcon(parent.icon_id)}</span>
                            <span>{parent.display_name}</span>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </div>
                        <div className="mt-1 space-y-1 pl-11">
                          {children.map(child => (
                            <div key={child.id} className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600">
                              <span>{child.display_name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-50">
                        <span className="mr-3 text-gray-400">{getIcon(parent.icon_id)}</span>
                        <span>{parent.display_name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {sidebarParents.filter(p => localSidebarAccess[p.id]).length === 0 && (
                <div className="text-gray-500 text-sm text-center py-8">
                  No sidebar items selected.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
