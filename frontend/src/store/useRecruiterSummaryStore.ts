import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

export interface RecruiterSummary {
  myOpenJobs: number;
  myRequirements: number;
  myCandidates: number;
  todaysResumeUploads: number;
  todaysCandidateSubmissions: number;
  totalSubmissions: number;
  totalInterviews: number;
  totalOffers: number;
  totalPlacements: number;
  averageTimeToSubmit: number;
  activeJobsWithNoSubmissions: number;
  upcomingInterviews: Array<{
    id: string;
    round_name: string;
    scheduled_at: string;
    mode: string;
    status: string;
    job_title?: string;
    job_company?: string;
    candidate_name?: string;
    candidate_email?: string;
  }>;
}

interface RecruiterSummaryState {
  summary: RecruiterSummary | null;
  isLoading: boolean;
  error: string | null;
}

interface RecruiterSummaryActions {
  fetchSummary: () => Promise<void>;
  clearError: () => void;
}

export const useRecruiterSummaryStore = create<RecruiterSummaryState & RecruiterSummaryActions>(
  (set) => ({
    // Initial state
    summary: null,
    isLoading: false,
    error: null,

    // Actions
    fetchSummary: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/dashboard/recruiter-summary');
        
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
