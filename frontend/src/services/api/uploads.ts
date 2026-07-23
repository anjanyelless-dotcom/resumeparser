import { apiClient } from "./client";

export const uploadResume = async (
  file: File,
  onProgress?: (progress: number) => void,
) => {
  const formData = new FormData();
  formData.append("resume", file);
  const response = await apiClient.post("/upload/resume", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 minutes for parsing-heavy uploads
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
    `/jobs/${jobId}/status`,
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
  }>(`/jobs/${jobId}/extraction-debug`);
  return response.data;
};

export interface PreviewSectionsResponse {
  filename: string;
  extraction_method: string;
  raw_text_length: number;
  raw_text: string;
  total_sections: number;
  sections: {
    contact?: { text: string; char_count: number };
    summary?: { text: string; char_count: number };
    education?: { text: string; char_count: number };
    experience?: { text: string; char_count: number };
    skills?: { text: string; char_count: number };
    certifications?: { text: string; char_count: number };
    projects?: { text: string; char_count: number };
  };
  detected_sections: string[];
  missing_sections: string[];
}

export const previewSections = async (file: File, forceOcr = false) => {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("force_ocr", forceOcr ? "true" : "false");

  const response = await apiClient.post<PreviewSectionsResponse>(
    "/upload/preview-sections",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000, // 2 minutes for section preview
    }
  );
  return response.data;
};

export interface ParseSectionsResponse {
  status: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
    location?: string;
  };
  summary?: string;
  work_experience?: Array<{
    company: string;
    job_title: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
    description?: string;
    location?: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    gpa?: number;
  }>;
  skills?: string[];
  certifications?: Array<{
    name: string;
    issuing_organization?: string;
    issue_date?: string;
    expiry_date?: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
    start_date?: string;
    end_date?: string;
  }>;
}

export const parseSections = async (
  sections: PreviewSectionsResponse['sections'],
  rawText: string,
  model = "gpt-4o-mini"
) => {
  const response = await apiClient.post<ParseSectionsResponse>(
    "/upload/parse-sections",
    {
      model,
      experience_text: sections.experience?.text || "",
      education_text: sections.education?.text || "",
      skills_text: sections.skills?.text || "",
      summary_text: sections.summary?.text || "",
      certifications_text: sections.certifications?.text || "",
      projects_text: sections.projects?.text || "",
      contact_text: sections.contact?.text || "",
      raw_text: rawText,
    },
    {
      timeout: 300000, // 5 minutes for AI parsing
    }
  );
  return response.data;
};
