import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

interface ClientManagerSummary {
  assignedClientsCount: number;
  openRequirementsCount: number;
  pendingFeedbackCount: number;
  followUpsDueCount: number;
}

interface ClientManagerSummaryState {
  summary: ClientManagerSummary | null;
  isLoading: boolean;
  error: string | null;
}

interface ClientManagerSummaryActions {
  fetchSummary: () => Promise<void>;
  clearError: () => void;
}

export const useClientManagerSummaryStore = create<ClientManagerSummaryState & ClientManagerSummaryActions>(
  (set) => ({
    // Initial state
    summary: null,
    isLoading: false,
    error: null,

    // Actions
    fetchSummary: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/dashboard/client-manager-summary');
        
        set({
          summary: response.data,
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch summary' });
        toast.error(error.response?.data?.message || 'Failed to fetch summary');
      }
    },

    clearError: () => {
      set({ error: null });
    },
  })
);