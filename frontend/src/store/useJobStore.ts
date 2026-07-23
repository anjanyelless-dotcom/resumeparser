import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

interface Job {
  id: string;
  title: string;
  description: string;
  min_experience_years?: number;
  max_experience_years?: number;
  education_requirement?: string;
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
}

interface MatchResult {
  id: string;
  job_id: string;
  candidate_id: string;
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
  created_at: string;
}

interface JobState {
  jobs: Job[];
  currentJob: Job | null;
  matchResults: MatchResult[];
  isLoading: boolean;
  isMatching: boolean;
  matchingProgress: number;
  error: string | null;
}

interface JobActions {
  fetchJobs: () => Promise<void>;
  fetchJob: (id: string) => Promise<void>;
  createJob: (jobData: Partial<Job>) => Promise<Job>;
  updateJob: (id: string, jobData: Partial<Job>) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;
  runMatching: (jobId: string, limit?: number) => Promise<void>;
  fetchMatchResults: (jobId: string) => Promise<void>;
  setCurrentJob: (job: Job | null) => void;
  setMatchingProgress: (progress: number) => void;
  clearError: () => void;
  clearMatchResults: () => void;
}

export const useJobStore = create<JobState & JobActions>((set) => ({
  // Initial state
  jobs: [],
  currentJob: null,
  matchResults: [],
  isLoading: false,
  isMatching: false,
  matchingProgress: 0,
  error: null,

  // Actions
  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/jobs");
      set({ jobs: response.data.jobs || [], isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch jobs";
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

  runMatching: async (jobId: string, limit = 20) => {
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
        `Matching completed for ${response.data.total_candidates} candidates`,
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
}));
