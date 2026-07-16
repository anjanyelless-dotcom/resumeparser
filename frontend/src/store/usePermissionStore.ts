import { create } from "zustand";
import api from "../services/api";

interface UserPermission {
  module_name: string;
  action_name: string;
}

interface Permission {
  id: string;
  module_name: string;
  action_name: string;
  description?: string;
}

interface PermissionState {
  userPermissions: UserPermission[];  // Current user's permissions
  allPermissions: Permission[];        // Full permission catalog
  permissions: Permission[];           // Alias for allPermissions
  roles: any[];                        // Role management
  rolePermissions: any[];              // Role permissions mapping
  isLoading: boolean;
  error: string | null;
  fetchUserPermissions: () => Promise<void>;
  fetchAllPermissions: () => Promise<void>;
  fetchPermissions: () => Promise<void>;  // Alias for fetchAllPermissions
  fetchRoles: () => Promise<void>;
  fetchRolePermissions: () => Promise<void>;
  updateRolePermissions: (roleId: string, permissions: string[]) => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  clearError: () => void;
  reset: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  userPermissions: [],
  allPermissions: [],
  permissions: [],
  roles: [],
  rolePermissions: [],
  isLoading: false,
  error: null,

  fetchUserPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/permissions/me");
      set({ 
        userPermissions: response.data.permissions || [], 
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to fetch user permissions";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchAllPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/permissions");
      set({ 
        allPermissions: response.data.permissions || [], 
        permissions: response.data.permissions || [],
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to fetch permission catalog";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/permissions");
      set({ 
        allPermissions: response.data.permissions || [], 
        permissions: response.data.permissions || [],
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to fetch permissions";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/roles");
      set({ 
        roles: response.data.roles || [], 
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to fetch roles";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchRolePermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/role-permissions");
      set({ 
        rolePermissions: response.data || [], 
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to fetch role permissions";
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateRolePermissions: async (roleId: string, permissions: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/roles/${roleId}/permissions`, { permissions });
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to update role permissions";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  hasPermission: (module: string, action: string) => {
    const { userPermissions } = get();
    return userPermissions.some(
      permission => 
        permission.module_name === module && 
        permission.action_name === action
    );
  },

  clearError: () => set({ error: null }),

  reset: () => set({ 
    userPermissions: [], 
    allPermissions: [],
    permissions: [],
    roles: [],
    rolePermissions: [],
    isLoading: false, 
    error: null 
  }),
}));
