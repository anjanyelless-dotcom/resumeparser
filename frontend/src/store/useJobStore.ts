import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

export interface Job {
  id: string;
  title: string;
  description: string;
  min_experience_years?: number;
  max_experience_years?: number;
  education_requirement?: string;
  education_level?: string;
  employment_type?: string;
  seniority_level?: string;
  location?: string;
  salary_range?: string;
  department?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  salary_period?: string;
  client_id?: string;
  manual_client_name?: string;
  number_of_openings?: number;
  notice_period?: string;
  required_skills?: Array<{
    id: string;
    skill_name: string;
    skill_type: "required" | "preferred";
  }>;
  preferred_skills?: Array<{
    id: string;
    skill_name: string;
    skill_type: "required" | "preferred";
  }>;
  // Dashboard Metrics
  priority?: string;
  team_lead_id?: string;
  team_lead_name?: string;
  team_lead_assignment_status?: string;
  recruiters_assigned_count?: number;
  recruiter_capacity_max?: number;
  total_openings?: number;
  filled_positions?: number;
  remaining_positions?: number;
  total_candidates?: number;
  parsed?: number;
  jd_matched?: number;
  ai_matched?: number;
  shortlisted?: number;
  submitted?: number;
  interviews?: number;
  offers?: number;
  joined?: number;
  placements?: number;
  // Recruiter Progress Metrics
  candidates_sourced?: number;
  ai_shortlisted?: number;
  submitted_count?: number;
  client_approved?: number;
  interviews_count?: number;
  offers_count?: number;
  assignment_priority?: string;
  due_date?: string;
  company_name?: string;
  assigned_by_name?: string;
  current_recruitment_stage?: string;
  next_action?: string;
  next_action_type?: "MODAL" | "PAGE" | "NONE";
  next_action_route?: string;
  action_enabled?: boolean;
  action_message?: string;
  job_health_indicator?: string;
  recruitment_progress_percentage?: number;
  completed_stages?: string[];
  pending_stages?: string[];
  available_actions?: Array<{
    id: string;
    label: string;
    type: string;
    enabled: boolean;
    message: string;
  }>;
}

interface MatchResult {
  id: string;
  job_id: string;
  candidate_id: string;
  job_title?: string;
  candidate_name: string;
  candidate_email: string;
  candidate_location: string;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  matching_skills: string[];
  missing_skills: string[];
  extra_skills: string[];
  experience_gap_years: number;
  recommendation:
    | "Strong Match"
    | "Good Match"
    | "Partial Match"
    | "Not Recommended";
  reason: string;
  recruiter_decision?: string;
  recruiter_notes?: string;
  created_at: string;
}

export interface PipelineSummary {
  candidate_sourcing: number;
  jd_matching: number;
  ai_matching: number;
  shortlisted: number;
  hiring_process: number;
  client_review: number;
  interviews: number;
  offers: number;
  joined: number;
  placed: number;
}

interface JobState {
  jobs: Job[];
  currentJob: Job | null;
  matchResults: MatchResult[];
  isLoading: boolean;
  isMatching: boolean;
  matchingProgress: number;
  error: string | null;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  } | null;
  activeJobId: string | null;
  pipelineSummary: PipelineSummary | null;
}

interface JobActions {
  fetchJobs: (params?: { page?: number; limit?: number; search?: string; department?: string; location?: string; adminView?: boolean; status?: string }) => Promise<void>;
  fetchJob: (id: string) => Promise<void>;
  createJob: (jobData: Partial<Job>) => Promise<Job>;
  updateJob: (id: string, jobData: Partial<Job>) => Promise<Job>;
  clarifyJob: (id: string, jobData: Partial<Job>) => Promise<Job>;
  updateJobStatus: (id: string, status: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  runMatching: (jobId: string, limit?: number) => Promise<void>;
  fetchMatchResults: (jobId: string) => Promise<void>;
  updateRecruiterDecision: (jobId: string, candidates: { candidate_id: string; decision: string; notes?: string }[]) => Promise<void>;
  submitToHiringProcess: (jobId: string, candidateIds: string[]) => Promise<void>;
  setCurrentJob: (job: Job | null) => void;
  setMatchingProgress: (progress: number) => void;
  clearError: () => void;
  clearMatchResults: () => void;
  setActiveJobId: (id: string | null) => void;
  fetchPipelineSummary: (jobId: string) => Promise<void>;
}

export const useJobStore = create<JobState & JobActions>((set, get) => ({
  // Initial state
  jobs: [],
  currentJob: null,
  matchResults: [],
  isLoading: false,
  isMatching: false,
  matchingProgress: 0,
  error: null,
  pagination: null,
  activeJobId: null,
  pipelineSummary: null,

  // Actions
  fetchJobs: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.department) queryParams.append('department', params.department);
      if (params.location) queryParams.append('location', params.location);
      if (params.status) queryParams.append('status', params.status);
      if (params.adminView) queryParams.append('adminView', 'true');

      const response = await api.get(`/jobs?${queryParams.toString()}`);
      set({ jobs: response.data.jobs || [], pagination: response.data.pagination || null, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to fetch jobs";
      set({ error: errorMessage, isLoading: false, jobs: [] });
      toast.error(errorMessage);
    }
  },

  fetchJob: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/jobs/${id}`);
      set({ currentJob: response.data.job, isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch job";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  createJob: async (jobData: Partial<Job>) => {
    try {
      const response = await api.post("/jobs", jobData);
      const newJob = response.data.job;

      set((state) => ({
        jobs: [...state.jobs, newJob],
        currentJob: newJob,
      }));

      toast.success("Job created successfully");
      return newJob;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to create job";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateJob: async (id: string, jobData: Partial<Job>) => {
    try {
      const response = await api.put(`/jobs/${id}`, jobData);
      const updatedJob = response.data.job;

      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === id ? updatedJob : job)),
        currentJob: state.currentJob?.id === id ? updatedJob : state.currentJob,
      }));

      toast.success("Job updated successfully");
      return updatedJob;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to update job";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  clarifyJob: async (id: string, jobData: Partial<Job>) => {
    try {
      const response = await api.patch(`/jobs/${id}/clarify`, jobData);
      const updatedJob = response.data.job;

      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === id ? updatedJob : job)),
        currentJob: state.currentJob?.id === id ? updatedJob : state.currentJob,
      }));

      toast.success("Job requirements clarified successfully");
      return updatedJob;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to clarify job requirements";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateJobStatus: async (id: string, status: string) => {
    try {
      const response = await api.patch(`/jobs/${id}/status`, { status });
      const updatedJob = response.data.job;

      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === id ? { ...job, status: updatedJob.status } : job)),
        currentJob: state.currentJob?.id === id ? { ...state.currentJob, status: updatedJob.status } : state.currentJob,
      }));

      toast.success("Job status updated successfully");
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to update job status";
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteJob: async (id: string) => {
    try {
      await api.delete(`/jobs/${id}`);
      set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id),
        currentJob: state.currentJob?.id === id ? null : state.currentJob,
        matchResults: state.matchResults.filter(
          (result) => result.job_id !== id,
        ),
      }));
      toast.success("Job deleted successfully");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to delete job";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  runMatching: async (jobId: string, limit: number = 100) => {
    set({ isMatching: true, matchingProgress: 0, error: null });
    try {
      const response = await api.post(`/matching/job/${jobId}/candidates`, {
        limit,
      });

      set({
        matchResults: response.data.matches || [],
        isMatching: false,
        matchingProgress: 100,
      });

      toast.success(
        `Matching completed for ${response.data.matches?.length || 0} candidates`,
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to run matching";
      set({ error: errorMessage, isMatching: false, matchingProgress: 0, matchResults: [] });
      toast.error(errorMessage);
      throw error;
    }
  },

  fetchMatchResults: async (jobId: string) => {
    set({ isLoading: true, error: null });
    try {
      // If jobId is 'all', use the all results endpoint
      const endpoint =
        jobId === "all"
          ? "/matching/results"
          : `/matching/job/${jobId}/results`;
      const response = await api.get(endpoint);
      set({ matchResults: response.data.matches || [], isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch match results";
      set({ error: errorMessage, isLoading: false, matchResults: [] });
      toast.error(errorMessage);
    }
  },

  updateRecruiterDecision: async (jobId: string, candidates: { candidate_id: string; decision: string; notes?: string }[]) => {
    try {
        await api.patch(`/matching/job/${jobId}/decision`, { candidates });
        
        // Refresh dynamically from backend
        await get().fetchMatchResults("all");
        
        toast.success("Recruiter decision updated");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to update recruiter decision";
      toast.error(errorMessage);
      throw error;
    }
  },

  submitToHiringProcess: async (jobId: string, candidateIds: string[]) => {
    try {
      await api.post(`/matching/job/${jobId}/submit-to-hiring`, { candidateIds });
      
      // Update local state to reflect submission
      set((state) => ({
        matchResults: state.matchResults.map((result) => {
          if (candidateIds.includes(result.candidate_id)) {
            return {
              ...result,
              recruiter_decision: 'Moved To Hiring Process',
            };
          }
          return result;
        })
      }));
      
      toast.success("Candidates submitted to hiring process successfully");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to submit to hiring process";
      toast.error(errorMessage);
      throw error;
    }
  },

  setCurrentJob: (job: Job | null) => {
    set({ currentJob: job });
  },

  setMatchingProgress: (progress: number) => {
    set({ matchingProgress: progress });
  },

  clearError: () => {
    set({ error: null });
  },

  clearMatchResults: () => {
    set({ matchResults: [] });
  },

  setActiveJobId: (id: string | null) => {
    set({ activeJobId: id });
    if (id) {
      get().fetchJob(id);
      get().fetchPipelineSummary(id);
    } else {
      set({ pipelineSummary: null, currentJob: null });
    }
  },

  fetchPipelineSummary: async (jobId: string) => {
    try {
      const response = await api.get(`/api/jobs/${jobId}/pipeline-summary`);
      set({ pipelineSummary: response.data });
    } catch (error: any) {
      console.error("Failed to fetch pipeline summary:", error);
    }
  },
}));
