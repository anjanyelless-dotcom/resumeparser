import { User, Building2, MapPin, Briefcase, ChevronRight, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BooleanSearchCandidate {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  current_title?: string;
  current_company?: string;
  years_experience?: number;
  skills: string[];
  // ATS scoring fields (null for boolean search)
  overall_score: null;
  skill_score: null;
  experience_score: null;
  education_score: null;
  role_score: null;
  project_score: null;
  certification_score: null;
  matching_skills: null;
  missing_skills: null;
  extra_skills: null;
  experience_gap_years: null;
  recommendation: null;
  match_summary: null;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface BooleanSearchResultsProps {
  candidates: BooleanSearchCandidate[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function BooleanSearchResults({
  candidates,
  pagination,
  onPageChange,
  loading = false,
}: BooleanSearchResultsProps) {
  const navigate = useNavigate();

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const getAvatarBg = (name: string) => {
    const colors = [
      "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-blue-500",
      "bg-teal-500", "bg-green-600", "bg-orange-500", "bg-rose-500",
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f18622]"></div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No candidates found</h3>
        <p className="text-gray-500 text-sm">
          Try adjusting your boolean search query to find matching candidates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{pagination.total_items}</span> candidate{pagination.total_items !== 1 ? 's' : ''}
        </p>
      </div>

      {candidates.map((candidate) => (
        <div
          key={candidate.id}
          className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarBg(candidate.full_name)}`}
              >
                {getInitials(candidate.full_name)}
              </div>

              {/* Candidate Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {candidate.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">{candidate.email}</p>
                  </div>
                  <button
                    onClick={() => handleViewCandidate(candidate.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#f18622] hover:bg-[#d9751a] rounded-lg transition-colors flex items-center gap-2"
                  >
                    View Profile
                  </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  {candidate.current_title && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{candidate.current_title}</span>
                    </div>
                  )}
                  {candidate.current_company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{candidate.current_company}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{candidate.location}</span>
                    </div>
                  )}
                  {candidate.years_experience !== undefined && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{candidate.years_experience} years</span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.slice(0, 8).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 8 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          +{candidate.skills.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Page <span className="font-semibold text-gray-900">{pagination.current_page}</span> of{" "}
            <span className="font-semibold text-gray-900">{pagination.total_pages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.current_page - 1)}
              disabled={!pagination.has_prev_page}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.current_page + 1)}
              disabled={!pagination.has_next_page}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}