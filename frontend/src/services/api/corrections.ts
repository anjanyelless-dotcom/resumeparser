import { apiClient } from "./client";

export type CorrectionRecord = {
  candidate_name: string | null;
  candidate_email: string | null;
  field: string;
  original: string | null;
  corrected: string | null;
  reviewer: string | null;
  corrected_at: string;
};

export const fetchRecentCorrections = async (limit = 50) => {
  const response = await apiClient.get<CorrectionRecord[]>(
    `/api/corrections/recent?limit=${limit}`,
  );
  return response.data;
};
