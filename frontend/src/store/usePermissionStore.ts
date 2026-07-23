import { create } from "zustand";
import api from "../services/api";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description?: string;
  status?: string;
  is_system?: boolean;
  role_type?: string;
  version?: number;
  default_scope?: string;
  user_count?: number;
  created_at?: string;
  updated_at?: string;
  updated_by_name?: string;
}

export interface Action {
  id: string;
  name: string;
  display_name: string;
  sort_order: number;
}

export interface RbacModule {
  id: string;
  name: string;
  display_name: string;
  category: string;
  route?: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
}

export interface SidebarModule {
  id: string;
  name: string;
  display_name: string;
  parent_id?: string | null;
  group_name?: string;
  icon?: string;
  icon_id?: string;
  route?: string;
  sort_order: number;
  is_active: boolean;
  children?: SidebarModule[];
}

export interface SidebarPermission {
  sidebar_module_id: string;
  name: string;
  display_name: string;
  parent_id?: string | null;
  icon?: string;
  route?: string;
  sort_order: number;
  visible: boolean;
}

export interface ModuleTree {
  id: string;
  name: string;
  display_name: string;
  category?: string;
  children?: ModuleTree[];
  [key: string]: any;
}

export interface RolePermission {
  module_id: string;
  module_name?: string;
  display_name?: string;
  category?: string;
  action: string;
  allowed: boolean;
  scope_id?: string | null;
  sidebar_visible?: boolean;
}

export interface Scope {
  id: string;
  name: string;
  display_name: string;
}

// ────────────────────────────────────────────────────────────────
// Legacy types kept for backward compat (used by other pages)
// ────────────────────────────────────────────────────────────────
interface UserPermission {
  module_name: string;
  action_name: string;
}

interface LegacyPermission {
  id: string;
  module_name: string;
  action_name: string;
  description?: string;
}

// ────────────────────────────────────────────────────────────────
// Store interface
// ────────────────────────────────────────────────────────────────
interface PermissionState {
  // Legacy
  userPermissions: UserPermission[];
  allPermissions: LegacyPermission[];
  permissions: LegacyPermission[];
  rolePermissions: any[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Enterprise
  roles: Role[];
  actions: Action[];
  rbacModules: RbacModule[];
  rbacModulesGrouped: Record<string, RbacModule[]>;
  sidebarModules: SidebarModule[];
  sidebarModulesTree: SidebarModule[];

  // Active role state
  activeRole: Role | null;
  activeModulePermissions: RolePermission[];
  activeSidebarPermissions: SidebarPermission[];
  scopes: Scope[];

  // Legacy compat
  modules: ModuleTree[];
  activeRolePermissions: RolePermission[];

  // ─────── Actions ───────
  // Legacy
  fetchUserPermissions: () => Promise<void>;
  fetchAllPermissions: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  fetchPermissionCatalog: () => Promise<void>;
  fetchRolePermissions: (roleId: string) => Promise<void>;
  updateRolePermissions: (roleId: string, permissions: RolePermission[]) => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  clearError: () => void;
  reset: () => void;

  // Enterprise
  fetchActions: () => Promise<void>;
  fetchRbacModules: () => Promise<void>;
  fetchSidebarModules: () => Promise<void>;
  fetchEnterpriseRoleConfig: (roleId: string) => Promise<void>;
  saveEnterpriseRoleConfig: (
    roleId: string,
    payload: {
      version?: number;
      module_permissions?: RolePermission[];
      sidebar_permissions?: { sidebar_module_id: string; visible: boolean }[];
      default_scope?: string;
    }
  ) => Promise<{ new_version: number }>;
  cloneRolePermissions: (sourceRoleId: string, targetRoleId: string) => Promise<void>;
}

// ────────────────────────────────────────────────────────────────
// Store implementation
// ────────────────────────────────────────────────────────────────
export const usePermissionStore = create<PermissionState>((set, get) => ({
  // Legacy state
  userPermissions: [],
  allPermissions: [],
  permissions: [],
  rolePermissions: [],
  isLoading: false,
  isInitialized: false,
  error: null,

  // Enterprise state
  roles: [],
  actions: [],
  rbacModules: [],
  rbacModulesGrouped: {},
  sidebarModules: [],
  sidebarModulesTree: [],
  activeRole: null,
  activeModulePermissions: [],
  activeSidebarPermissions: [],
  scopes: [],

  // Legacy compat aliases
  modules: [],
  activeRolePermissions: [],

  // ─────── Legacy implementations ──────────────────────────────

  fetchUserPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const [permissionsRes, sidebarRes] = await Promise.all([
        api.get("/permissions/me"),
        api.get("/admin/rbac/sidebar")
      ]);
      set({ 
        userPermissions: permissionsRes.data.permissions || [], 
        activeSidebarPermissions: sidebarRes.data.sidebar || [],
        isLoading: false,
        isInitialized: true
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to fetch user permissions", isLoading: false, isInitialized: true });
    }
  },

  fetchAllPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/permissions");
      set({
        allPermissions: response.data.permissions || [],
        permissions: response.data.permissions || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to fetch permission catalog", isLoading: false });
    }
  },

  fetchPermissions: async () => {
    return get().fetchAllPermissions();
  },

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/admin/rbac/roles");
      set({ roles: response.data.roles || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to fetch roles", isLoading: false });
    }
  },

  // fetchPermissionCatalog: initial load that fetches roles + scopes + sidebar modules
  fetchPermissionCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      const [rolesRes, actionsRes, modulesRes, sidebarRes, scopesRes] = await Promise.all([
        api.get("/admin/rbac/roles"),
        api.get("/admin/rbac/actions"),
        api.get("/admin/rbac/modules"),
        api.get("/admin/rbac/sidebar/all"),
        api.get("/admin/rbac/scopes"),
      ]);

      // Build module tree from flat modules for legacy compat
      const flatMods: RbacModule[] = modulesRes.data.modules || [];
      const moduleTree: ModuleTree[] = flatMods.map((m) => ({ id: m.id, name: m.name, display_name: m.display_name, category: m.category }));

      const scopesFromApi: Scope[] = (scopesRes.data.scopes || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        display_name: s.display_name,
      }));

      set({
        roles: rolesRes.data.roles || [],
        actions: actionsRes.data.actions || [],
        rbacModules: flatMods,
        rbacModulesGrouped: modulesRes.data.grouped || {},
        sidebarModules: sidebarRes.data.sidebar_modules || [],
        sidebarModulesTree: sidebarRes.data.tree || [],
        modules: moduleTree,
        scopes: scopesFromApi,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to load permission catalog", isLoading: false });
    }
  },

  fetchRolePermissions: async (roleId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/admin/rbac/roles/${roleId}/configuration`);
      const { role, permissions, sidebar_access } = response.data;
      set({
        activeRole: role,
        activeModulePermissions: permissions || [],
        activeSidebarPermissions: sidebar_access || [],
        // Legacy compat
        activeRolePermissions: (permissions || []).map((p: any) => ({
          module_id: p.module_id,
          action: p.action_id,
          allowed: p.allowed ?? true,
          scope_id: p.scope_id,
          sidebar_visible: p.sidebar_visible,
        })),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to fetch role permissions", isLoading: false });
    }
  },

  updateRolePermissions: async (_roleId: string, _permissions: RolePermission[]): Promise<void> => {
    // Legacy stub - do not use for new enterprise config
    console.warn("Using legacy updateRolePermissions");
  },

  hasPermission: (module: string, action: string) => {
    const { userPermissions } = get();
    return userPermissions.some((p) => p.module_name === module && p.action_name === action);
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      userPermissions: [],
      allPermissions: [],
      permissions: [],
      roles: [],
      rolePermissions: [],
      isLoading: false,
      error: null,
      activeRole: null,
      activeModulePermissions: [],
      activeSidebarPermissions: [],
      activeRolePermissions: [],
    }),

  // ─────── Enterprise implementations ──────────────────────────

  fetchActions: async () => {
    try {
      const response = await api.get("/admin/rbac/actions");
      set({ actions: response.data.actions || [] });
    } catch (error: any) {
      console.error("Fetch actions error:", error);
    }
  },

  fetchRbacModules: async () => {
    try {
      const response = await api.get("/admin/rbac/modules");
      set({ rbacModules: response.data.modules || [], rbacModulesGrouped: response.data.grouped || {} });
    } catch (error: any) {
      console.error("Fetch rbac modules error:", error);
    }
  },

  fetchSidebarModules: async () => {
    try {
      const response = await api.get("/admin/rbac/sidebar/all");
      set({ sidebarModules: response.data.sidebar_modules || [], sidebarModulesTree: response.data.tree || [] });
    } catch (error: any) {
      console.error("Fetch sidebar modules error:", error);
    }
  },

  fetchEnterpriseRoleConfig: async (roleId: string) => {
    return get().fetchRolePermissions(roleId);
  },

  saveEnterpriseRoleConfig: async (roleId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/admin/rbac/roles/${roleId}`, payload);
      set({ isLoading: false });
      return { new_version: response.data.new_version };
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to save role configuration", isLoading: false });
      throw error;
    }
  },

  cloneRolePermissions: async (sourceRoleId, targetRoleId) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/permissions/role/${sourceRoleId}/clone`, { targetRoleId });
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to clone role", isLoading: false });
      throw error;
    }
  },
}));
