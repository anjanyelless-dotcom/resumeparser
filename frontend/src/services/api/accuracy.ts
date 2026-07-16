import { apiClient } from "./client";

export type AccuracyOverview = {
  total_jobs: number;
  success_jobs: number;
  failed_jobs: number;
  success_rate: number;
  avg_processing_seconds: number;
  avg_confidence: number;
  correction_rate: number;
  section_scores: Array<{ label: string; score: number }>;
  recent_runs: Array<{
    job_id: string;
    status: string;
    confidence: number;
    notes: string;
  }>;
};

export const fetchAccuracyOverview = async () => {
  const response = await apiClient.get<AccuracyOverview>(
    "/api/accuracy/overview",
  );
  return response.data;
};
