export type CandidateStatus = "pending" | "processing" | "success" | "failed";

export type ReviewStatus = "pending" | "in_review" | "approved" | "rejected";

export interface Skill {
  id: string;
  name: string;
  category?: string | null;
  normalized_name?: string | null;
  source?: string | null;
}

export interface CandidateSkill {
  proficiency_level?: string | null;
  years_experience?: number | null;
  skill?: Skill | null;
}

export interface WorkHistory {
  id: string;
  company_name?: string | null;
  client_name?: string | null;
  job_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  location?: string | null;
  description?: string | null;
}

export interface Education {
  id: string;
  institution?: string | null;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  gpa?: number | string | null;
  honors?: string | null;
  description?: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuing_organization?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_id?: string | null;
}

export interface ParsingJob {
  id: string;
  candidate_id: string;
  filename: string;
  file_path: string;
  status: string;
  task_id?: string | null;
  last_stage?: string | null;
  parsed_data?: Record<string, unknown> | null;
  confidence_score?: number | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface Candidate {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  summary?: string | null;
  summary_manually_edited?: boolean | null;
  years_experience?: number | null;
  current_title?: string | null;
  current_company?: string | null;
  status: CandidateStatus;
  created_at: string;
  updated_at: string;
  skills?: Skill[];
  review_status?: ReviewStatus | null;
  review_assigned_to?: string | null;
  review_notes?: string | null;
  review_confidence?: number | null;
  work_history?: WorkHistory[];
  education?: Education[];
  candidate_skills?: CandidateSkill[];
  parsing_jobs?: ParsingJob[];
  certifications?: Certification[];
}
