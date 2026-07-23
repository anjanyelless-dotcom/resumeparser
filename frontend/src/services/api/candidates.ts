import { apiClient } from "./client";
import type { Candidate, ParsingJob } from "../../types/candidate";

export const fetchCandidates = async (signal?: AbortSignal) => {
  const response = await apiClient.get<Candidate[]>("/api/candidates", {
    signal,
  });
  return response.data;
};

export const fetchCandidate = async (id: string) => {
  const response = await apiClient.get<Candidate>(`/api/candidates/${id}`);
  return response.data;
};

export const fetchCandidateReview = async (id: string) => {
  const response = await apiClient.get<{
    candidate: Candidate;
    latest_job: ParsingJob | null;
    review_flags: {
      overall_confidence: number | null;
      flagged_fields: Record<string, number>;
      discrepancies: string[];
    };
    suggested_corrections?: Record<string, string>;
  }>(`/api/candidates/${id}/review`);
  return response.data;
};

export const submitCorrections = async (
  id: string,
  corrections: Array<{
    field_name: string;
    original_value?: string | null;
    corrected_value?: string | null;
  }>,
  reviewNotes?: string,
) => {
  const response = await apiClient.put<Candidate>(
    `/api/candidates/${id}/corrections`,
    {
      corrections,
      review_notes: reviewNotes,
    },
  );
  return response.data;
};

export const approveCandidate = async (id: string) => {
  const response = await apiClient.post<Candidate>(
    `/api/candidates/${id}/approve`,
  );
  return response.data;
};

export const reprocessCandidate = async (id: string) => {
  const response = await apiClient.post(`/api/candidates/${id}/reprocess`);
  return response.data as { job_id: string; status: string };
};

export const downloadResume = async (id: string) => {
  const response = await apiClient.get<{ download_url: string }>(
    `/api/candidates/${id}/resume`,
  );
  return response.data.download_url;
};

export const exportCandidateJson = async (id: string) => {
  const response = await apiClient.get(`/api/gdpr/export/${id}`);
  return response.data as Record<string, unknown>;
};

export const deleteCandidate = async (id: string) => {
  await apiClient.delete(`/api/candidates/${id}`);
};

// --- Work History CRUD ---
export type WorkHistoryPayload = Partial<{
  company_name: string | null;
  client_name: string | null;
  job_title: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  description: string | null;
  display_order: number | null;
}>;

export const createWorkHistory = async (
  candidateId: string,
  payload: WorkHistoryPayload,
) => {
  const response = await apiClient.post<Candidate>(
    `/api/candidates/${candidateId}/work-history`,
    payload,
  );
  return response.data;
};

export const updateWorkHistory = async (
  candidateId: string,
  entryId: string,
  payload: WorkHistoryPayload,
) => {
  const response = await apiClient.put<Candidate>(
    `/api/candidates/${candidateId}/work-history/${entryId}`,
    payload,
  );
  return response.data;
};

export const deleteWorkHistory = async (
  candidateId: string,
  entryId: string,
) => {
  const response = await apiClient.delete<Candidate>(
    `/api/candidates/${candidateId}/work-history/${entryId}`,
  );
  return response.data;
};

// --- Education CRUD ---
export type EducationPayload = Partial<{
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: number | null;
  description: string | null;
}>;

export const createEducation = async (
  candidateId: string,
  payload: EducationPayload,
) => {
  const response = await apiClient.post<Candidate>(
    `/api/candidates/${candidateId}/education`,
    payload,
  );
  return response.data;
};

export const updateEducation = async (
  candidateId: string,
  entryId: string,
  payload: EducationPayload,
) => {
  const response = await apiClient.put<Candidate>(
    `/api/candidates/${candidateId}/education/${entryId}`,
    payload,
  );
  return response.data;
};

export const deleteEducation = async (candidateId: string, entryId: string) => {
  const response = await apiClient.delete<Candidate>(
    `/api/candidates/${candidateId}/education/${entryId}`,
  );
  return response.data;
};

// --- Certifications CRUD ---
export type CertificationPayload = Partial<{
  name: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
}>;

export const createCertification = async (
  candidateId: string,
  payload: CertificationPayload,
) => {
  const response = await apiClient.post<Candidate>(
    `/api/candidates/${candidateId}/certifications`,
    payload,
  );
  return response.data;
};

export const updateCertification = async (
  candidateId: string,
  entryId: string,
  payload: CertificationPayload,
) => {
  const response = await apiClient.put<Candidate>(
    `/api/candidates/${candidateId}/certifications/${entryId}`,
    payload,
  );
  return response.data;
};

export const deleteCertification = async (
  candidateId: string,
  entryId: string,
) => {
  const response = await apiClient.delete<Candidate>(
    `/api/candidates/${candidateId}/certifications/${entryId}`,
  );
  return response.data;
};
