import { create } from "zustand";
import api from "../services/api";

interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
}

interface PermissionState {
  permissions: Permission[];
  roles: string[];
  rolePermissions: Record<string, Permission[]>;
  isLoading: boolean;
  error: string | null;
  fetchPermissions: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  fetchRolePermissions: (role: string) => Promise<void>;
  updateRolePermissions: (role: string, permissions: string[]) => Promise<void>;
  clearError: () => void;
}

export const usePermissionStore = create<PermissionState>((set) => ({
  permissions: [],
  roles: [],
  rolePermissions: {},
  isLoading: false,
  error: null,

  fetchPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/permissions");
      set({ 
        permissions: response.data.permissions || [], 
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to fetch permissions";
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
      const errorMessage = error.response?.data?.detail || "Failed to fetch roles";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchRolePermissions: async (role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/roles/${role}/permissions`);
      set((state) => ({
        rolePermissions: {
          ...state.rolePermissions,
          [role]: response.data.permissions,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to fetch role permissions";
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateRolePermissions: async (role, permissions) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/roles/${role}/permissions`, { permissions });
      set((state) => ({
        rolePermissions: {
          ...state.rolePermissions,
          [role]: response.data.permissions,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to update role permissions";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
