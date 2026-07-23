import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  usePermissionStore,
  type RolePermission,
  type SidebarPermission,
} from '../store/usePermissionStore';
import { RoleSidebar } from '../components/Permissions/RoleSidebar';
import { Toolbar } from '../components/Permissions/Toolbar';
import { PermissionSummary } from '../components/Permissions/PermissionSummary';
import { SidebarTreeConfig } from '../components/Permissions/SidebarTreeConfig';
import { PermissionMatrix } from '../components/Permissions/PermissionMatrix';
import { LiveSidebarPreview } from '../components/Permissions/LiveSidebarPreview';
import { Save, AlertCircle, ShieldAlert, RefreshCw, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';



export const RolesAndPermissionsPage: React.FC = () => {
  const {
    actions,
    rbacModules,
    scopes,
    isLoading,
    activeRole,
    activeModulePermissions,
    activeSidebarPermissions,
    fetchPermissionCatalog,
    fetchRolePermissions,
    saveEnterpriseRoleConfig,
    cloneRolePermissions,
  } = usePermissionStore();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<RolePermission[]>([]);
  const [draftSidebar, setDraftSidebar] = useState<SidebarPermission[]>([]);
  const [defaultScope, setDefaultScope] = useState<string>('assigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load catalog once
  useEffect(() => {
    fetchPermissionCatalog();
  }, []);

  // When role changes — load its configuration
  useEffect(() => {
    if (selectedRoleId) {
      fetchRolePermissions(selectedRoleId);
      setHasUnsavedChanges(false);
    }
  }, [selectedRoleId]);

  // Sync drafts when server data arrives
  useEffect(() => {
    setDraftPermissions(activeModulePermissions);
    setHasUnsavedChanges(false);
  }, [activeModulePermissions]);

  useEffect(() => {
    setDraftSidebar(activeSidebarPermissions);
    setHasUnsavedChanges(false);
  }, [activeSidebarPermissions]);

  useEffect(() => {
    if (activeRole?.default_scope) {
      setDefaultScope(activeRole.default_scope);
    }
  }, [activeRole]);

  // admin is_system but still configurable (no lock-out on admin role)
  const isSuperAdmin = false;
  const isSystemRole = activeRole?.is_system;

  // ─── Permission toggle logic ──────────────────────────────────

  const handleToggleAction = useCallback((moduleId: string, moduleNameKey: string, action: string, allowed: boolean) => {
    setHasUnsavedChanges(true);
    setDraftPermissions((prev) => {
      let newDraft = [...prev];
      const idx = newDraft.findIndex((p) => p.module_id === moduleId && p.action === action);

      if (idx >= 0) {
        newDraft[idx] = { ...newDraft[idx], allowed };
      } else {
        newDraft.push({ module_id: moduleId, module_name: moduleNameKey, action, allowed, scope_id: defaultScope, sidebar_visible: false });
      }

      // Dependency: unchecking view disables all others
      if (action === 'view' && !allowed) {
        newDraft = newDraft.map((p) =>
          p.module_id === moduleId && p.action !== 'view' ? { ...p, allowed: false } : p
        );
      }

      // Dependency: enabling any non-view action forces view on
      if (action !== 'view' && allowed) {
        const viewIdx = newDraft.findIndex((p) => p.module_id === moduleId && p.action === 'view');
        if (viewIdx >= 0) {
          newDraft[viewIdx] = { ...newDraft[viewIdx], allowed: true };
        } else {
          newDraft.push({ module_id: moduleId, module_name: moduleNameKey, action: 'view', allowed: true, scope_id: defaultScope, sidebar_visible: false });
        }
      }

      return newDraft;
    });
  }, [defaultScope]);

  const handleChangeScope = useCallback((moduleId: string, scopeId: string) => {
    setHasUnsavedChanges(true);
    setDraftPermissions((prev) =>
      prev.map((p) => (p.module_id === moduleId ? { ...p, scope_id: scopeId } : p))
    );
  }, []);

  const handleSelectAllModule = useCallback((moduleId: string, moduleNameKey: string, allowed: boolean) => {
    setHasUnsavedChanges(true);
    setDraftPermissions((prev) => {
      let newDraft = [...prev];
      
      actions.forEach((action) => {
        // If unchecking, simply set all to false
        if (!allowed) {
          const idx = newDraft.findIndex((p) => p.module_id === moduleId && p.action === action.name);
          if (idx >= 0) {
            newDraft[idx] = { ...newDraft[idx], allowed: false };
          }
          return;
        }

        // If checking, set all to true
        const idx = newDraft.findIndex((p) => p.module_id === moduleId && p.action === action.name);
        if (idx >= 0) {
          newDraft[idx] = { ...newDraft[idx], allowed: true };
        } else {
          newDraft.push({ module_id: moduleId, module_name: moduleNameKey, action: action.name, allowed: true, scope_id: defaultScope, sidebar_visible: false });
        }
      });
      return newDraft;
    });
  }, [actions, defaultScope]);

  const handleToggleAllPermissions = useCallback((allowed: boolean) => {
    setHasUnsavedChanges(true);
    setDraftPermissions((prev) => {
      let newDraft = [...prev];
      if (!allowed) {
        // Uncheck all existing
        newDraft = newDraft.map(p => ({ ...p, allowed: false }));
      } else {
        // Check all existing actions for all loaded modules
        // Note: we only update loaded modules (derived from existing draftPermissions)
        const uniqueModules = Array.from(new Set(newDraft.map(p => p.module_id)));
        uniqueModules.forEach(moduleId => {
          const moduleNameKey = newDraft.find(p => p.module_id === moduleId)?.module_name || '';
          actions.forEach(action => {
            const idx = newDraft.findIndex((p) => p.module_id === moduleId && p.action === action.name);
            if (idx >= 0) {
              newDraft[idx] = { ...newDraft[idx], allowed: true };
            } else {
              newDraft.push({ module_id: moduleId, module_name: moduleNameKey, action: action.name, allowed: true, scope_id: defaultScope, sidebar_visible: false });
            }
          });
        });
      }
      return newDraft;
    });
  }, [actions, defaultScope]);

  const handleToggleAllSidebar = useCallback((visible: boolean) => {
    setHasUnsavedChanges(true);
    setDraftSidebar((prev) => prev.map((sp) => ({ ...sp, visible })));
  }, []);

  // ─── Bulk operations ─────────────────────────────────────────

  const handleSelectAll = () => {
    handleToggleAllPermissions(true);
  };

  const handleClearAll = () => {
    setHasUnsavedChanges(true);
    setDraftPermissions([]);
  };

  const handleViewOnly = () => {
    setHasUnsavedChanges(true);
    setDraftPermissions(() => {
      return rbacModules.map((mod) => ({
        module_id: mod.id,
        module_name: mod.name,
        action: 'view',
        allowed: true,
        scope_id: defaultScope,
        sidebar_visible: false,
      }));
    });
  };

  // ─── Sidebar toggle ───────────────────────────────────────────

  const handleToggleSidebar = useCallback((sidebarModuleId: string, visible: boolean, childIds: string[]) => {
    setHasUnsavedChanges(true);
    setDraftSidebar((prev) => {
      const toUpdate = [sidebarModuleId, ...childIds];
      return prev.map((sp) =>
        toUpdate.includes(sp.sidebar_module_id) ? { ...sp, visible } : sp
      );
    });
  }, []);

  // ─── Clone role ───────────────────────────────────────────────

  const handleClone = async (sourceRoleId: string) => {
    if (!selectedRoleId) return;
    try {
      await cloneRolePermissions(sourceRoleId, selectedRoleId);
      await fetchRolePermissions(selectedRoleId);
      toast.success('Permissions cloned successfully');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to clone role permissions');
    }
  };

  // ─── Save (unified transactional) ────────────────────────────

  const handleSave = async () => {
    if (!selectedRoleId || isSuperAdmin || isSaving) return;
    setIsSaving(true);

    const payload = {
      version: activeRole?.version,
      module_permissions: draftPermissions,
      sidebar_permissions: draftSidebar.map((sp) => ({
        sidebar_module_id: sp.sidebar_module_id,
        visible: sp.visible,
      })),
      default_scope: defaultScope,
    };

    try {
      await saveEnterpriseRoleConfig(selectedRoleId, payload);
      setHasUnsavedChanges(false);
      toast.success('Permissions saved successfully!');
      // Refresh to get new version
      await fetchRolePermissions(selectedRoleId);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.error('Conflict: Another admin modified this role. Please reload.');
      } else if (status === 400 && e?.response?.data?.error === 'System role protection') {
        toast.error(e.response.data.message);
      } else {
        toast.error(e?.response?.data?.message || 'Failed to save permissions');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Filtered modules ─────────────────────────────────────────
  const filteredModules = useMemo(() => {
    if (!searchQuery) return rbacModules;
    const q = searchQuery.toLowerCase();
    return rbacModules.filter((m) => m.display_name.toLowerCase().includes(q));
  }, [rbacModules, searchQuery]);

  // Legacy modules shape for LiveSidebarPreview
  const legacyModules = useMemo(() =>
    draftSidebar.filter((sp) => !sp.parent_id).map((sp) => ({
      id: sp.sidebar_module_id,
      name: sp.name,
      display_name: sp.display_name,
      children: draftSidebar.filter((child) => child.parent_id === sp.sidebar_module_id).map((child) => ({
        id: child.sidebar_module_id,
        name: child.name,
        display_name: child.display_name,
        children: [],
      })),
    })),
    [draftSidebar]
  );

  const legacyDraftPermissions = useMemo(() =>
    draftSidebar.map((sp) => ({
      module_id: sp.sidebar_module_id,
      action: 'view',
      allowed: sp.visible,
      sidebar_visible: sp.visible,
      scope_id: null,
    })),
    [draftSidebar]
  );

  return (
    <div className="h-full flex overflow-hidden bg-gray-50">
      {/* Left: Roles list */}
      <RoleSidebar selectedRoleId={selectedRoleId} onSelectRole={setSelectedRoleId} />

      {/* Right: Config area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedRoleId ? (
          <>
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Configure: <span className="text-indigo-600">{activeRole?.name}</span>
                  </h1>
                  {activeRole?.updated_by_name && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Last saved by {activeRole.updated_by_name}
                    </p>
                  )}
                </div>
                {/* Bulk ops */}
                {!isSuperAdmin && (
                  <div className="flex items-center space-x-2">
                    <button onClick={handleSelectAll} className="flex items-center space-x-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700">
                      <CheckSquare className="w-3.5 h-3.5" /><span>Select All</span>
                    </button>
                    <button onClick={handleViewOnly} className="flex items-center space-x-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700">
                      <span>View Only</span>
                    </button>
                    <button onClick={handleClearAll} className="flex items-center space-x-1 px-2 py-1.5 text-xs border border-red-200 rounded bg-white hover:bg-red-50 text-red-600">
                      <Square className="w-3.5 h-3.5" /><span>Clear All</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search + Clone toolbar */}
            <Toolbar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSuperAdmin={isSuperAdmin}
              onReset={() => {
                setDraftPermissions(activeModulePermissions);
                setDraftSidebar(activeSidebarPermissions);
                setHasUnsavedChanges(false);
              }}
              onCopyFrom={handleClone}
              currentRoleId={selectedRoleId}
            />

            {/* Main scrollable area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Role Info + Summary */}
              <PermissionSummary
                role={activeRole}
                draftPermissions={draftPermissions}
                draftSidebarPermissions={draftSidebar}
                isSuperAdmin={isSuperAdmin}
              />

              {/* Data Access Scope (global default) */}
              {!isSuperAdmin && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Global Data Access Scope</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Sets the default data boundary for this role. Individual modules can override this below.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {scopes.map((scope) => (
                      <label key={scope.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="defaultScope"
                          value={scope.id}
                          checked={defaultScope === scope.id}
                          onChange={() => { setDefaultScope(scope.id); setHasUnsavedChanges(true); }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{scope.display_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Sidebar Visibility */}
                  <SidebarTreeConfig
                    sidebarPermissions={draftSidebar}
                    onToggleSidebar={handleToggleSidebar}
                    onToggleAllSidebar={handleToggleAllSidebar}
                    isSuperAdmin={isSuperAdmin}
                  />

                  {/* Module Permission Matrix (dynamic columns) */}
                  {isLoading ? (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <PermissionMatrix
                      modules={filteredModules}
                      actions={actions}
                      scopes={scopes}
                      draftPermissions={draftPermissions}
                      onToggleAction={handleToggleAction}
                      onChangeScope={handleChangeScope}
                      onSelectAllModule={handleSelectAllModule}
                      onToggleAllPermissions={handleToggleAllPermissions}
                      isSuperAdmin={isSuperAdmin}
                      searchQuery={searchQuery}
                    />
                  )}
                </div>

                {/* Right: Live Preview */}
                <div className="lg:col-span-1">
                  <LiveSidebarPreview
                    modules={legacyModules}
                    draftPermissions={legacyDraftPermissions}
                    isSuperAdmin={isSuperAdmin}
                  />
                </div>
              </div>
            </div>

            {/* Footer bar */}
            <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex items-center space-x-3">
                {hasUnsavedChanges && (
                  <div className="flex items-center text-amber-600 space-x-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Unsaved changes</span>
                  </div>
                )}
                {isSystemRole && !isSuperAdmin && (
                  <div className="flex items-center text-blue-600 space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs">System role — critical permissions protected</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setDraftPermissions(activeModulePermissions);
                    setDraftSidebar(activeSidebarPermissions);
                    setHasUnsavedChanges(false);
                  }}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSuperAdmin || isSaving}
                  className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isSaving
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                    : <><Save className="w-4 h-4" /><span>Save Permissions</span></>
                  }
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No role selected</h3>
              <p className="mt-1 text-sm text-gray-500">Select a role from the sidebar to configure its permissions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RolesAndPermissionsPage;
