import { apiClient } from "./client";

export interface Job {
  id: string;
  title: string;
  description?: string;
  status?: string;
}

export interface JobsResponse {
  jobs: Job[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

export const fetchJobs = async (limit = 100): Promise<JobsResponse> => {
  const response = await apiClient.get<JobsResponse>(`/jobs?limit=${limit}`);
  return response.data;
};

export const getDefaultJobId = async (): Promise<string | null> => {
  try {
    const data = await fetchJobs(1);
    const jobs = data?.jobs || [];
    return jobs.length > 0 ? jobs[0].id : null;
  } catch (error) {
    console.warn("Failed to fetch default job ID:", error);
    return null;
  }
};
