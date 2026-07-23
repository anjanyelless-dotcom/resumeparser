import { User, Building2, MapPin, Briefcase, Award, CheckCircle, XCircle, ExternalLink, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";

interface ScoredCandidate {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  current_title?: string;
  current_company?: string;
  years_experience?: number;
  skills: string[];
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  role_score: number;
  project_score: number;
  certification_score: number;
  matching_skills: string[];
  missing_skills: string[];
  extra_skills: string[];
  experience_gap_years?: number;
  recommendation: string;
  match_summary: string;
}

interface ExternalCandidate {
  name: string;
  profile_url: string;
  snippet?: string;
  source: "linkedin_google" | "github";
  avatar_url?: string;
  location?: string;
}

interface ExternalCandidatesData {
  triggered: boolean;
  sources: string[];
  results: ExternalCandidate[];
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface CandidateResultsProps {
  candidates: ScoredCandidate[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  loading?: boolean;
  externalCandidates?: ExternalCandidatesData;
  onImportedCandidate?: (candidate: ScoredCandidate) => void;
  searchRole?: string;
  searchSkills?: string[];
}

export default function CandidateResults({
  candidates,
  pagination,
  onPageChange,
  loading = false,
  externalCandidates,
  onImportedCandidate,
  searchRole,
  searchSkills,
}: CandidateResultsProps) {
  const navigate = useNavigate();

  const handleImportCandidate = async (
    externalCandidate: ExternalCandidate,
    role?: string,
    skills?: string[]
  ) => {
    try {
      const response = await api.post("/candidates/import-external", {
        name: externalCandidate.name,
        profile_url: externalCandidate.profile_url,
        snippet: externalCandidate.snippet,
        source: externalCandidate.source,
        role: role,
        skills: skills,
      });

      if (response.data.success) {
        toast.success("Candidate imported successfully!");

        // Convert the imported candidate to ScoredCandidate format
        const importedCandidate: ScoredCandidate = {
          id: response.data.candidate.id,
          full_name: response.data.candidate.full_name,
          email: "pending@imported.com", // Placeholder until enriched
          current_title: response.data.candidate.current_title || undefined,
          skills: skills || [],
          overall_score: 0,
          skill_score: 0,
          experience_score: 0,
          education_score: 0,
          role_score: 0,
          project_score: 0,
          certification_score: 0,
          matching_skills: skills || [],
          missing_skills: [],
          extra_skills: [],
          recommendation: "Pending Review",
          match_summary: "Imported from external source. Awaiting resume upload for full analysis.",
        };

        // Notify parent component to add to list
        if (onImportedCandidate) {
          onImportedCandidate(importedCandidate);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to import candidate");
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === "linkedin_google") {
      return "bg-blue-100 text-blue-800";
    } else if (source === "github") {
      return "bg-gray-800 text-white";
    }
    return "bg-slate-100 text-slate-800";
  };

  const getSourceLabel = (source: string) => {
    if (source === "linkedin_google") return "LinkedIn";
    if (source === "github") return "GitHub";
    return source;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getRecommendationBadge = (recommendation: string) => {
    if (recommendation === "Strong Match") {
      return "bg-green-100 text-green-800";
    } else if (recommendation === "Good Match") {
      return "bg-blue-100 text-blue-800";
    } else if (recommendation === "Average Match") {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      </div>
    );
  }

  const showExternalSection =
    externalCandidates?.triggered &&
    externalCandidates.results.length > 0 &&
    candidates.length < 5; // Only show if internal results below threshold

  if (candidates.length === 0 && !showExternalSection) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <User className="h-16 w-16 text-slate-300" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No candidates found</h3>
        <p className="mt-2 text-sm text-slate-600">
          Try adjusting your filters to see more results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Internal Candidates Section */}
      {candidates.length > 0 && (
        <div>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Internal Candidates ({pagination.total_items})
              </h3>
              <p className="text-sm text-slate-600">
                Page {pagination.current_page} of {pagination.total_pages}
              </p>
            </div>
          </div>

          {/* Candidate Cards */}
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                onClick={() => navigate(`/candidates/${candidate.id}`)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-brand-300"
              >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {candidate.full_name || "Unknown"}
                  </h4>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getRecommendationBadge(
                      candidate.recommendation
                    )}`}
                  >
                    {candidate.recommendation}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                  {candidate.email && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {candidate.email}
                    </span>
                  )}
                  {candidate.current_title && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {candidate.current_title}
                    </span>
                  )}
                  {candidate.current_company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {candidate.current_company}
                    </span>
                  )}
                  {candidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {candidate.location}
                    </span>
                  )}
                  {candidate.years_experience !== undefined && (
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      {candidate.years_experience} years experience
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-2xl font-bold ${getScoreColor(
                    candidate.overall_score
                  )}`}
                >
                  {candidate.overall_score}%
                </div>
                <p className="mt-1 text-xs text-slate-600">Overall Score</p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-6">
              <div className="text-center">
                <p className="text-xs text-slate-600">Skills</p>
                <p className="text-lg font-semibold text-slate-900">
                  {candidate.skill_score}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600">Experience</p>
                <p className="text-lg font-semibold text-slate-900">
                  {candidate.experience_score}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600">Role</p>
                <p className="text-lg font-semibold text-slate-900">
                  {candidate.role_score}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600">Projects</p>
                <p className="text-lg font-semibold text-slate-900">
                  {candidate.project_score}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600">Education</p>
                <p className="text-lg font-semibold text-slate-900">
                  {candidate.education_score}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600">Certifications</p>
                <p className="text-lg font-semibold text-slate-900">
                  {candidate.certification_score}%
                </p>
              </div>
            </div>

            {/* Skills */}
            <div className="mt-4 space-y-2">
              {candidate.matching_skills.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    Matching Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.matching_skills.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {candidate.missing_skills.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    Missing Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.missing_skills.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800"
                      >
                        <XCircle className="h-3 w-3" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {candidate.extra_skills.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    Extra Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.extra_skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Match Summary */}
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-700">{candidate.match_summary}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
          <button
            onClick={() => onPageChange(pagination.current_page - 1)}
            disabled={!pagination.has_prev_page}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
              let pageNum;
              if (pagination.total_pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.current_page <= 3) {
                pageNum = i + 1;
              } else if (pagination.current_page >= pagination.total_pages - 2) {
                pageNum = pagination.total_pages - 4 + i;
              } else {
                pageNum = pagination.current_page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    pageNum === pagination.current_page
                      ? "bg-brand-500 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => onPageChange(pagination.current_page + 1)}
            disabled={!pagination.has_next_page}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white"
          >
            Next
          </button>
        </div>
      )}
      </div>
      )}

    {/* External Candidates Section */}
    {showExternalSection && (
      <div className="border-t border-slate-200 pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            External Candidates ({externalCandidates?.results.length})
          </h3>
          <p className="text-sm text-slate-600">
            Found on {externalCandidates?.sources.join(" and ")}
          </p>
        </div>
        <div className="space-y-3">
          {externalCandidates?.results.map((candidate, index) => (
            <div
              key={`${candidate.source}-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-semibold text-slate-900">
                      {candidate.name}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getSourceBadge(
                        candidate.source
                      )}`}
                    >
                      {getSourceLabel(candidate.source)}
                    </span>
                  </div>
                  {candidate.snippet && (
                    <p className="mb-3 text-sm text-slate-600 line-clamp-2">
                      {candidate.snippet}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <a
                      href={candidate.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Profile
                    </a>
                    <button
                      onClick={() => handleImportCandidate(candidate, searchRole, searchSkills)}
                      disabled={false}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Import
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* No Internal Candidates Message */}
    {candidates.length === 0 && showExternalSection && (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <User className="h-12 w-12 text-slate-400 mx-auto" />
        <h3 className="mt-2 text-base font-semibold text-slate-900">
          No matching candidates found in your database
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Check external candidates below from {externalCandidates?.sources.join(" and ")}
        </p>
      </div>
    )}
  </div>
  );
}
