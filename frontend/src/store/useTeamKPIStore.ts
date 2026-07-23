import { create } from 'zustand';
import api from '../services/api';

interface RecruiterKPI {
  recruiter_id: string;
  recruiter_email: string;
  recruiter_name: string;
  submissions_count: number;
  active_submissions_count: number;
  total_reviews: number;
  approved_reviews: number;
  approval_rate: number;
  interviews_count: number;
  total_activities: number;
  activity_breakdown: {
    submissions_created: number;
    submissions_reviewed: number;
    interviews_scheduled: number;
    candidates_created: number;
    jobs_created: number;
  };
}

interface TeamTotals {
  total_submissions: number;
  total_active_submissions: number;
  total_reviews: number;
  total_approved_reviews: number;
  approval_rate: number;
  total_interviews: number;
  total_activities: number;
  recruiter_count: number;
  total_activity_breakdown: {
    submissions_created: number;
    submissions_reviewed: number;
    interviews_scheduled: number;
    candidates_created: number;
    jobs_created: number;
  };
}

interface DateRange {
  from: string | null;
  to: string | null;
}

interface TeamKPIStore {
  kpis: RecruiterKPI[];
  teamTotals: TeamTotals | null;
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;
  
  fetchTeamKPIs: (dateRange?: DateRange) => Promise<void>;
  setDateRange: (dateRange: DateRange) => void;
  clearError: () => void;
}

export const useTeamKPIStore = create<TeamKPIStore>((set, get) => ({
  kpis: [],
  teamTotals: null,
  dateRange: { from: null, to: null },
  isLoading: false,
  error: null,

  fetchTeamKPIs: async (dateRange) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from);
      if (dateRange?.to) params.append('to', dateRange.to);

      const response = await api.get(`/team/kpis?${params.toString()}`);
      set({
        kpis: response.data.kpis,
        teamTotals: response.data.team_totals,
        dateRange: response.data.date_range,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to fetch team KPIs:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch team KPIs',
        isLoading: false,
      });
    }
  },

  setDateRange: (dateRange) => {
    set({ dateRange });
    get().fetchTeamKPIs(dateRange);
  },

  clearError: () => set({ error: null }),
}));