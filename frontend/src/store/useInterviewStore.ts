import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

interface Interview {
  id: string;
  submission_id: string;
  round_name: string;
  scheduled_at: string;
  mode: string;
  status: string;
  scheduled_by: string;
  created_at: string;
  updated_at: string;
  job_title?: string;
  job_company?: string;
  candidate_name?: string;
  candidate_email?: string;
  scheduled_by_name?: string;
  feedback?: {
    id: string;
    outcome: string;
    notes?: string;
    rating?: number;
    provided_by: string;
    created_at: string;
  };
}

interface InterviewState {
  interviews: Interview[];
  upcomingInterviews: Interview[];
  currentInterview: Interview | null;
  isLoading: boolean;
  isScheduling: boolean;
  isSubmittingFeedback: boolean;
  error: string | null;
}

interface InterviewActions {
  createInterview: (submissionId: string, roundName: string, scheduledAt: string, mode: string) => Promise<Interview>;
  updateInterview: (interviewId: string, scheduledAt?: string, status?: string) => Promise<Interview>;
  getUpcomingInterviews: () => Promise<void>;
  getInterviewsForMyClients: () => Promise<Interview[]>;
  addInterviewFeedback: (interviewId: string, outcome: string, notes?: string, rating?: number) => Promise<void>;
  getInterviewsBySubmission: (submissionId: string) => Promise<void>;
  setCurrentInterview: (interview: Interview | null) => void;
  clearError: () => void;
}

export const useInterviewStore = create<InterviewState & InterviewActions>(
  (set, get) => ({
    // Initial state
    interviews: [],
    upcomingInterviews: [],
    currentInterview: null,
    isLoading: false,
    isScheduling: false,
    isSubmittingFeedback: false,
    error: null,

    // ──────────────────────────────────────────────────────
    // Create Interview — POST /api/interviews
    // ──────────────────────────────────────────────────────
    createInterview: async (submissionId: string, roundName: string, scheduledAt: string, mode: string) => {
      set({ isScheduling: true, error: null });
      try {
        const response = await api.post('/interviews', {
          submission_id: submissionId,
          round_name: roundName,
          scheduled_at: scheduledAt,
          mode: mode
        });

        const interview = response.data.interview;
        
        // Refresh upcoming interviews list
        await get().getUpcomingInterviews();
        
        set({ isScheduling: false });
        toast.success('Interview scheduled successfully!');
        return interview;
      } catch (error: any) {
        set({ isScheduling: false });
        
        if (error.response?.status === 404) {
          toast.error(error.response?.data?.message || 'Submission not found');
        } else if (error.response?.status === 403) {
          toast.error('You do not have permission to schedule interviews');
        } else if (error.response?.status === 400) {
          toast.error(error.response?.data?.message || 'Invalid interview details');
        } else {
          toast.error(error.response?.data?.message || 'Failed to schedule interview');
        }
        
        throw error;
      }
    },

    // ──────────────────────────────────────────────────────
    // Update Interview — PATCH /api/interviews/:id
    // ──────────────────────────────────────────────────────
    updateInterview: async (interviewId: string, scheduledAt?: string, status?: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.patch(`/interviews/${interviewId}`, {
          ...(scheduledAt && { scheduled_at: scheduledAt }),
          ...(status && { status })
        });

        const interview = response.data.interview;
        
        // Refresh upcoming interviews
        await get().getUpcomingInterviews();
        
        set({ isLoading: false });
        toast.success('Interview updated successfully!');
        return interview;
      } catch (error: any) {
        set({ isLoading: false });
        toast.error(error.response?.data?.message || 'Failed to update interview');
        throw error;
      }
    },

    // ──────────────────────────────────────────────────────
    // Get Upcoming Interviews — GET /api/interviews/upcoming
    // ──────────────────────────────────────────────────────
    getUpcomingInterviews: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/interviews/upcoming');
        
        set({
          upcomingInterviews: response.data.interviews || [],
          interviews: response.data.interviews || [],
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch upcoming interviews' });
        console.error('Failed to fetch upcoming interviews:', error?.response?.data?.message || error.message);
      }
    },

    // ──────────────────────────────────────────────────────
    // Get Interviews for My Clients — uses upcoming endpoint
    // ──────────────────────────────────────────────────────
    getInterviewsForMyClients: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/interviews/upcoming');
        
        const interviews = response.data.interviews || [];
        set({
          interviews,
          upcomingInterviews: interviews,
          isLoading: false
        });
        return interviews;
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch interviews' });
        console.error('Failed to fetch interviews for clients:', error?.response?.data?.message || error.message);
        return [];
      }
    },

    // ──────────────────────────────────────────────────────
    // Add Interview Feedback — POST /api/interviews/:id/feedback
    // ──────────────────────────────────────────────────────
    addInterviewFeedback: async (interviewId: string, outcome: string, notes?: string, rating?: number) => {
      set({ isSubmittingFeedback: true, error: null });
      try {
        await api.post(`/interviews/${interviewId}/feedback`, {
          outcome,
          notes,
          rating
        });

        set({ isSubmittingFeedback: false });
        toast.success('Interview feedback added successfully!');
        
        // Refresh interviews after feedback
        await get().getUpcomingInterviews();
      } catch (error: any) {
        set({ isSubmittingFeedback: false });
        
        if (error.response?.status === 409) {
          toast.error('Feedback already exists for this interview');
        } else if (error.response?.status === 400) {
          toast.error(error.response?.data?.message || 'Invalid feedback data');
        } else {
          toast.error(error.response?.data?.message || 'Failed to add interview feedback');
        }
        
        throw error;
      }
    },

    // ──────────────────────────────────────────────────────
    // Get Interviews by Submission — GET /api/interviews/upcoming (filtered)
    // ──────────────────────────────────────────────────────
    getInterviewsBySubmission: async (submissionId: string) => {
      set({ isLoading: true, error: null });
      try {
        // Use upcoming endpoint and filter client-side since no dedicated endpoint exists
        const response = await api.get('/interviews/upcoming');
        const allInterviews = response.data.interviews || [];
        const submissionInterviews = allInterviews.filter(
          (i: Interview) => i.submission_id === submissionId
        );
        
        set({
          interviews: submissionInterviews,
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch interviews' });
        // Silently fail - this is a background fetch
        console.warn('getInterviewsBySubmission failed:', error?.response?.data?.message || error.message);
      }
    },

    setCurrentInterview: (interview) => {
      set({ currentInterview: interview });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);