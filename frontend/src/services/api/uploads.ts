import { apiClient } from "./client";

export const uploadResume = async (
  file: File,
  onProgress?: (progress: number) => void,
) => {
  const formData = new FormData();
  formData.append("resume", file);
  const response = await apiClient.post("/api/upload/resume", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (!event.total) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress?.(progress);
    },
  });
  return response.data;
};

export const fetchJobStatus = async (jobId: string) => {
  const response = await apiClient.get<{ status: string }>(
    `/api/jobs/${jobId}/status`,
  );
  return response.data.status;
};

/** For data-loss verification: raw text length, samples, and parsed counts */
export const fetchJobExtractionDebug = async (jobId: string) => {
  const response = await apiClient.get<{
    job_id: string;
    raw_text_length: number;
    raw_text_sample_first_200: string;
    raw_text_sample_last_100: string;
    parsed_work_experience_count: number;
    parsed_work_description_total_chars: number;
    parsed_education_count: number;
    parsed_certifications_count: number;
    parsed_summary_length: number;
    text_extraction_method?: string;
    used_ocr?: boolean;
  }>(`/api/jobs/${jobId}/extraction-debug`);
  return response.data;
};
