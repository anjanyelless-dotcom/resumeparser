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

    // Actions
    createInterview: async (submissionId: string, roundName: string, scheduledAt: string, mode: string) => {
      set({ isScheduling: true, error: null });
      try {
        const response = await api.post('/api/interviews', {
          submission_id: submissionId,
          round_name: roundName,
          scheduled_at: scheduledAt,
          mode: mode
        });

        const interview = response.data.interview;
        
        // Refresh interviews for this submission
        await get().getInterviewsBySubmission(submissionId);
        
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

    updateInterview: async (interviewId: string, scheduledAt?: string, status?: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.patch(`/interviews/${interviewId}`, {
          ...(scheduledAt && { scheduled_at: scheduledAt }),
          ...(status && { status })
        });

        const interview = response.data.interview;
        
        // Refresh interviews for the submission
        if (interview.submission_id) {
          await get().getInterviewsBySubmission(interview.submission_id);
        }
        
        set({ isLoading: false });
        toast.success('Interview updated successfully!');
        return interview;
      } catch (error: any) {
        set({ isLoading: false });
        toast.error(error.response?.data?.message || 'Failed to update interview');
        throw error;
      }
    },

    getUpcomingInterviews: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/api/interviews/upcoming');
        
        set({
          upcomingInterviews: response.data.interviews || [],
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch upcoming interviews' });
        toast.error(error.response?.data?.message || 'Failed to fetch upcoming interviews');
      }
    },

    getInterviewsForMyClients: async () => {
      set({ isLoading: true, error: null });
      try {
        // We'll need to fetch interviews for the client manager's clients
        // For now, we'll use the upcoming interviews endpoint which should be scoped
        // In the future, this could be a dedicated endpoint like /api/interviews/for-my-clients
        const response = await api.get('/api/interviews/upcoming');
        
        set({
          interviews: response.data.interviews || [],
          isLoading: false
        });
        return response.data.interviews || [];
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch interviews for your clients' });
        toast.error(error.response?.data?.message || 'Failed to fetch interviews for your clients');
        return [];
      }
    },

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

    getInterviewsBySubmission: async (submissionId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get(`/submissions?candidateId=&jobId=&status=&submissionId=${submissionId}`);
        
        // Get interviews for each submission and merge
        const interviews = [];
        for (const submission of response.data.submissions || []) {
          try {
            const interviewResponse = await api.get(`/interviews?submissionId=${submission.id}`);
            interviews.push(...(interviewResponse.data.interviews || []));
          } catch (error) {
            // Skip if interviews endpoint doesn't exist or fails
            console.warn('Failed to fetch interviews for submission:', submission.id);
          }
        }
        
        set({
          interviews,
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch interviews' });
        // Don't show toast for this background fetch
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