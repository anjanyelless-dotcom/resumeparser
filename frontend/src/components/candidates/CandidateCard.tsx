import { useState } from "react";
import { User, Briefcase, Building, Calendar, GraduationCap, CheckSquare, Square } from "lucide-react";
import { calculateTotalExperience } from "../../utils/experienceCalculator";

// Use a more flexible candidate type to handle both store and types
type FlexibleCandidate = {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  summary?: string;
  raw_resume_text?: string;
  created_at: string;
  updated_at: string;
  match_score?: number;
  total_experience_years?: number;
  total_years_exp?: any;
  years_experience?: number;
  skills?: Array<{
    id: string;
    skill_name?: string;
    name?: string;
    category?: string;
    proficiency_level?: string;
    years_experience?: number;
    confidence_score?: number;
  }>;
  work_history?: Array<{
    id: string;
    job_title?: string;
    company_name?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
    location?: string;
    duration_string?: string | null;
  }>;
  work_experience?: Array<{
    id: string;
    job_title?: string;
    company_name?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
    location?: string;
    duration_string?: string | null;
  }>;
  education?: Array<{
    id: string;
    degree?: string;
    institution?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    gpa?: number;
  }>;
  parsing_status?: {
    status: string;
    progress?: number;
    confidence_score?: number;
    error_message?: string;
  };
};

type CandidateCardProps = {
  candidate: FlexibleCandidate;
  onViewProfile?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
};

export default function CandidateCard({ candidate, onViewProfile, isSelected, onSelect }: CandidateCardProps) {
  const [showAllSkills, setShowAllSkills] = useState(false);

  const fullName = candidate.full_name || (candidate as any).name || "Unnamed candidate";
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const email = candidate.email || "";

  // Formatting skills - handle both skill_name and name fields
  const skills = candidate.skills || [];
  const displaySkills = skills.slice(0, 4);
  const remainingSkillsCount = skills.length > 4 ? skills.length - 4 : 0;

  // Format added date
  const addedDate = candidate.created_at ? new Date(candidate.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : "Unknown Date";

  // Parsing score mock if unavailable
  const parseScore = (candidate as any).parsing_status?.confidence_score 
    ? Math.round((candidate as any).parsing_status.confidence_score * 100) 
    : 93;

  const workExperience = candidate.work_history || (candidate as any).work_experience || [];
  const currentCompany = workExperience.find((e: any) => e.is_current)?.company_name || "N/A";
  const jobTitle = workExperience.find((e: any) => e.is_current)?.job_title || "N/A";

  // Education data
  const education = candidate.education || (candidate as any).education_history || [];
  const latestEducation = education.length > 0 ? education[0] : null;
  const educationText = latestEducation 
    ? [latestEducation.degree, latestEducation.field_of_study, latestEducation.institution]
        .filter(Boolean)
        .join(' / ')
    : "N/A";

  // Total Experience calculations
  const { total } = calculateTotalExperience(workExperience);
  const totalExp = total.total_records > 0 && total.formatted_string !== "0 Days"
                   ? total.formatted_string
                   : (candidate.total_years_exp?.formatted_string ||
                     (candidate.years_experience ? `${candidate.years_experience} Years` : "N/A"));

  // Determine badge color based on score
  const getBadgeColor = (score: number) => {
    if (score >= 80) return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (score >= 60) return "bg-amber-50 border-amber-200 text-amber-700";
    return "bg-red-50 border-red-200 text-red-700";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      {/* Modern Header Section */}
      <div className="flex items-start justify-between mb-5">
        {/* Checkbox and Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Checkbox */}
          {onSelect && (
            <button
              onClick={() => onSelect(candidate.id)}
              className="shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-indigo-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          )}
          
          {/* Avatar and Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Fixed 56px Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
              {initials || <User className="w-6 h-6" />}
            </div>
            
            {/* Name and Email */}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 truncate leading-tight">
                {fullName}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {email}
              </p>
            </div>
          </div>
        </div>

        {/* Parse Score Badge - Top Right */}
        <div className="shrink-0 ml-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getBadgeColor(parseScore)}`}>
            <span className="text-xs font-semibold">Parse</span>
            <span className="text-sm font-bold">{parseScore}%</span>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-600 mb-2.5 uppercase tracking-wide">Skills</p>
        <div className="flex flex-wrap gap-2">
          {(showAllSkills ? skills : displaySkills).map((skill, idx) => (
            <span
              key={skill.id || idx}
              className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md text-xs font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {skill.skill_name || skill.name || 'Unknown Skill'}
            </span>
          ))}
          {remainingSkillsCount > 0 && (
            <button
              onClick={() => setShowAllSkills(!showAllSkills)}
              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              {showAllSkills ? `Show less` : `+${remainingSkillsCount}`}
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 my-4" />

      {/* Experience & Company Section */}
      <div className="flex flex-col gap-3.5 mb-4">
        {/* Total Experience */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 mb-0.5">Experience</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{totalExp}</p>
          </div>
        </div>

        {/* Current Company */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
            <Building className="w-4 h-4 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 mb-0.5">Current Role</p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {jobTitle !== "N/A" ? jobTitle : "Not specified"}
            </p>
            <p className="text-xs text-gray-500 truncate">{currentCompany}</p>
          </div>
        </div>

        {/* Education */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
            <GraduationCap className="w-4 h-4 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 mb-0.5">Education</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{educationText}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 my-4" />

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <button
          onClick={() => onViewProfile && onViewProfile(candidate.id)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm hover:shadow"
        >
          View Profile
        </button>
        <div className="flex items-center gap-1.5 text-gray-500 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs">{addedDate}</span>
        </div>
      </div>
    </div>
  );
}
