export interface JobAction {
  id: string;
  label: string;
  type: "PRIMARY" | "SECONDARY" | "DANGER" | string;
  enabled: boolean;
  message?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  education_level?: string;
  education_requirement?: string;
  employment_type?: string;
  seniority_level?: string;
  location?: string;
  salary_range?: string;
  department?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  currency?: string;
  salary_period?: string;
  work_mode?: string;
  number_of_openings?: number;
  notice_period?: string;
  salary_min?: number;
  salary_max?: number;
  client_id?: string;
  manual_client_name?: string;
  required_skills?: Array<{
    id: string;
    skill_name: string;
    skill_type: "required" | "preferred";
  } | string>;
  preferred_skills?: Array<{
    id: string;
    skill_name: string;
    skill_type: "required" | "preferred";
  } | string>;
  
  // Location fields
  country?: string;
  state?: string;
  city?: string;
  district?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  location_source?: "manual" | "pincode" | "geolocation";
  
  // Dashboard Metrics
  priority?: string;
  
  // Assignment metrics
  team_lead_id?: string;
  team_lead_name?: string;
  team_lead_assignment_status?: string;
  team_lead_assigned_at?: string;
  recruiters_assigned_count?: number;
  recruiter_capacity_max?: number;
  recruiters?: Array<{ id: string; name: string }>; // For recruiter variant if available
  
  // Progress metrics
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
  
  // Workflow engine fields
  current_recruitment_stage?: string;
  job_health_indicator?: string;
  recruitment_progress_percentage?: number;
  completed_stages?: string[];
  pending_stages?: string[];
  
  // Available Actions
  available_actions?: JobAction[];
}
