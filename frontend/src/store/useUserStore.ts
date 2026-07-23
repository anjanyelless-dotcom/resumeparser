import { create } from "zustand";
import api from "../services/api";

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  tenant_id: string;
  team_lead_id: string | null;
  created_at: string;
}

interface UserState {
  users: User[];
  teamLeads: User[];
  total: number;
  userStats: any;
  isLoading: boolean;
  error: string | null;
  fetchUsers: (skip?: number, limit?: number, filters?: { search?: string, role?: string, status?: string }) => Promise<void>;
  fetchUserStats: () => Promise<void>;
  fetchTeamLeads: () => Promise<void>;
  createUser: (userData: any) => Promise<void>;
  updateUser: (userId: string, userData: any) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserRole: (userId: string, role: string) => Promise<void>;
  updateUserTeamLead: (userId: string, teamLeadId: string | null) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  teamLeads: [],
  total: 0,
  userStats: null,
  isLoading: false,
  error: null,

  fetchUserStats: async () => {
    try {
      const response = await api.get('/dashboard/summary');
      if (response.data?.metrics) {
        set({ userStats: response.data.orgSummary });
      }
    } catch (error) {
      console.error("Failed to fetch user stats", error);
    }
  },

  fetchUsers: async (skip = 0, limit = 50, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append("skip", skip.toString());
      params.append("limit", limit.toString());
      if (filters.search) params.append("search", filters.search);
      if (filters.role) params.append("role", filters.role);
      if (filters.status) params.append("status", filters.status);

      const response = await api.get(`/users?${params.toString()}`);
      set({
        users: response.data.users || [],
        total: response.data.total || 0,
        isLoading: false
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to fetch users";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchTeamLeads: async () => {
    try {
      const response = await api.get('/users/team-leads');
      set({ teamLeads: response.data.team_leads || [] });
    } catch (error: any) {
      console.error("Failed to fetch team leads:", error);
    }
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/users", userData);
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to create user";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    set({ isLoading: true, error: null }); 
    try {
      const response = await api.put(`/users/${userId}`, userData);
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to update user";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/users/${userId}`);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to delete user";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateUserRole: async (userId, role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/users/${userId}/role`, { role });
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to update user role";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateUserTeamLead: async (userId, teamLeadId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/users/${userId}/team-lead`, { team_lead_id: teamLeadId });
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to update user team lead";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  activateUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/users/${userId}/activate`);
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to activate user";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deactivateUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/users/${userId}/deactivate`);
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to deactivate user";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
