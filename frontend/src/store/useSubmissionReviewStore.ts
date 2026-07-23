import { create } from 'zustand';
import api from '../services/api';

interface PendingSubmission {
  id: string;
  job_id: string;
  candidate_id: string;
  submitted_by: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  job_title: string;
  job_company?: string;
  department?: string;
  location?: string;
  candidate_name: string;
  candidate_email: string;
  recruiter_info: {
    email: string;
    name: string;
  };
  has_review: boolean;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface SubmissionReviewStore {
  submissions: PendingSubmission[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPendingSubmissions: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => Promise<void>;
  reviewSubmission: (submissionId: string, decision: string, notes?: string) => Promise<void>;
  clearError: () => void;
}

export const useSubmissionReviewStore = create<SubmissionReviewStore>((set, get) => ({
  submissions: [],
  pagination: null,
  isLoading: false,
  error: null,

  fetchPendingSubmissions: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);

      const response = await api.get(`/submissions/pending-review?${queryParams.toString()}`);
      set({
        submissions: response.data.submissions,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to fetch pending submissions:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch pending submissions',
        isLoading: false,
      });
    }
  },

  reviewSubmission: async (submissionId: string, decision: string, notes?: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/submissions/${submissionId}/review`, {
        decision,
        notes,
      });

      // Refresh the list after successful review
      const { pagination } = get();
      await get().fetchPendingSubmissions({
        page: pagination?.current_page || 1,
        limit: pagination?.items_per_page || 20,
      });

      set({ isLoading: false });
    } catch (error: any) {
      console.error('Failed to review submission:', error);
      set({
        error: error.response?.data?.message || 'Failed to review submission',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));