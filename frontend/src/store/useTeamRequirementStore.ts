import { create } from 'zustand';
import api from '../services/api';

interface TeamRequirement {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  status: string;
  employment_type?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  created_at: string;
  updated_at: string;
  client_id?: string;
  company_name?: string;
  assigned_recruiter_count: number;
  my_team_recruiter_count: number;
  is_my_team: boolean;
  is_unassigned: boolean;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface TeamRequirementStore {
  requirements: TeamRequirement[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTeamRequirements: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => Promise<void>;
  clearError: () => void;
}

export const useTeamRequirementStore = create<TeamRequirementStore>((set) => ({
  requirements: [],
  pagination: null,
  isLoading: false,
  error: null,

  fetchTeamRequirements: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);

      const response = await api.get(`/team-lead/requirements?${queryParams.toString()}`);
      set({
        requirements: response.data.requirements,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to fetch team requirements:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch team requirements',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));