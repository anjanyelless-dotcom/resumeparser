import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

interface Submission {
  id: string;
  job_id: string;
  candidate_id: string;
  submitted_by: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  job_title?: string;
  job_company?: string;
  candidate_name?: string;
  candidate_email?: string;
  submitted_by_name?: string;
}

interface SubmissionState {
  submissions: Submission[];
  mySubmissions: Submission[];
  currentSubmission: Submission | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  } | null;
  myPagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  } | null;
}

interface SubmissionActions {
  createSubmission: (jobId: string, candidateId: string) => Promise<Submission>;
  fetchSubmissions: (page?: number, limit?: number, jobId?: string, candidateId?: string, status?: string) => Promise<void>;
  fetchMySubmissions: (page?: number, limit?: number) => Promise<void>;
  fetchSubmissionsForMyClients: (status?: string) => Promise<Submission[]>;
  updateSubmissionStatus: (submissionId: string, status: string, rejectionReason?: string) => Promise<void>;
  updateClientOutcome: (submissionId: string, outcome: 'shortlisted' | 'rejected', notes?: string) => Promise<void>;
  setCurrentSubmission: (submission: Submission | null) => void;
  clearError: () => void;
}

export const useSubmissionStore = create<SubmissionState & SubmissionActions>(
  (set, get) => ({
    // Initial state
    submissions: [],
    mySubmissions: [],
    currentSubmission: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    pagination: null,
    myPagination: null,

    // Actions
    createSubmission: async (jobId: string, candidateId: string) => {
      set({ isSubmitting: true, error: null });
      try {
        const response = await api.post('/api/submissions', {
          job_id: jobId,
          candidate_id: candidateId
        });

        const submission = response.data.submission;
        
        // Refresh my submissions list
        await get().fetchMySubmissions();
        
        set({ isSubmitting: false });
        toast.success('Candidate submitted successfully!');
        return submission;
      } catch (error: any) {
        set({ isSubmitting: false });
        
        if (error.response?.status === 409) {
          toast.error(error.response?.data?.message || 'This candidate has already been submitted for this job');
        } else if (error.response?.status === 404) {
          toast.error(error.response?.data?.message || 'Job or candidate not found');
        } else if (error.response?.status === 403) {
          toast.error('You do not have permission to submit candidates');
        } else {
          toast.error(error.response?.data?.message || 'Failed to submit candidate');
        }
        
        throw error;
      }
    },

    fetchSubmissions: async (page = 1, limit = 20, jobId = '', candidateId = '', status = '') => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        
        if (jobId) params.append("jobId", jobId);
        if (candidateId) params.append("candidateId", candidateId);
        if (status) params.append("status", status);

        const response = await api.get(`/submissions?${params.toString()}`);
        
        set({
          submissions: response.data.submissions || [],
          pagination: response.data.pagination || null,
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch submissions' });
        toast.error(error.response?.data?.message || 'Failed to fetch submissions');
      }
    },

    fetchMySubmissions: async (page = 1, limit = 20) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());

        const response = await api.get(`/submissions/my?${params.toString()}`);
        
        set({
          mySubmissions: response.data.submissions || [],
          myPagination: response.data.pagination || null,
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch my submissions' });
        toast.error(error.response?.data?.message || 'Failed to fetch your submissions');
      }
    },

    updateSubmissionStatus: async (submissionId: string, status: string, rejectionReason?: string) => {
      set({ isLoading: true, error: null });
      try {
        await api.patch(`/submissions/${submissionId}/status`, {
          status,
          ...(rejectionReason && { rejectionReason })
        });

        // Refresh submissions lists
        await get().fetchSubmissions();
        await get().fetchMySubmissions();
        
        set({ isLoading: false });
        toast.success('Submission status updated successfully!');
      } catch (error: any) {
        set({ isLoading: false });
        toast.error(error.response?.data?.message || 'Failed to update submission status');
      }
    },

    fetchSubmissionsForMyClients: async (status?: string) => {
      set({ isLoading: true, error: null });
      try {
        const params: any = {};
        if (status) {
          params.status = status;
        }
        const response = await api.get('/api/submissions/for-my-clients', { params });
        set({ isLoading: false });
        return response.data.submissions;
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch submissions for your clients' });
        toast.error(error.response?.data?.message || 'Failed to fetch submissions for your clients');
        return [];
      }
    },

    updateClientOutcome: async (submissionId: string, outcome: 'shortlisted' | 'rejected', notes?: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.patch(`/submissions/${submissionId}/client-outcome`, {
          outcome,
          notes
        });

        set({ isLoading: false });
        toast.success('Client outcome recorded successfully!');
        return response.data.submission;
      } catch (error: any) {
        set({ isLoading: false });
        toast.error(error.response?.data?.message || 'Failed to record client outcome');
        throw error;
      }
    },

    setCurrentSubmission: (submission) => {
      set({ currentSubmission: submission });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);