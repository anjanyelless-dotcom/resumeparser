import { create } from 'zustand';
import api from '../services/api';

interface TeamLeadSummary {
  teamSize: number;
  openRequirementsCount: number;
  pendingReviewsCount: number;
  monthlyClosuresCount: number;
}

interface TeamLeadSummaryStore {
  summary: TeamLeadSummary | null;
  isLoading: boolean;
  error: string | null;
  
  fetchSummary: () => Promise<void>;
  clearError: () => void;
}

export const useTeamLeadSummaryStore = create<TeamLeadSummaryStore>((set) => ({
  summary: null,
  isLoading: false,
  error: null,

  fetchSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/dashboard/team-lead-summary');
      set({
        summary: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to fetch team lead summary:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch team lead summary',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));