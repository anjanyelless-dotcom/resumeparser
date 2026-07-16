import { useState, useEffect, useRef } from "react";
import { useCandidateStore } from "../../store/useCandidateStore";
import { useFilterStore } from "../../store/filterStore";
import { Search, X, User, Briefcase, GraduationCap } from "lucide-react";

interface Candidate {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  summary?: string | null;
  years_experience?: number | null;
  total_experience_years?: number | null;
  current_title?: string | null;
  current_company?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  skills?: Array<{
    id: string;
    skill_name: string;
    category?: string | null;
    proficiency_level?: string | null;
  }>;
  work_history?: Array<{
    id: string;
    job_title?: string | null;
    company_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean | null;
    description?: string | null;
  }>;
  education?: Array<{
    id: string;
    degree?: string | null;
    institution?: string | null;
    field_of_study?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    gpa?: number | string | null;
  }>;
  parsing_status?: {
    status?: string;
    confidence_score?: number;
  };
  match_score?: number;
}

interface CandidateSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate: (candidate: Candidate) => void;
  title?: string;
}

export default function CandidateSearchModal({ 
  isOpen, 
  onClose, 
  onSelectCandidate, 
  title = "Select Candidate" 
}: CandidateSearchModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [inputCompany, setInputCompany] = useState("");
  const [inputJobTitle, setInputJobTitle] = useState("");
  const [inputCertification, setInputCertification] = useState("");

  const { candidates, pagination, isLoading, fetchCandidates } = useCandidateStore();
  const { searchTerm, company, jobTitle, certification, setSearchTerm, setCompany, setJobTitle, setCertification, resetFilters } = useFilterStore();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const itemsPerPage = 10; // Smaller for modal

  // Debounced filter updates
  const debouncedUpdate = useRef(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setCompany(inputCompany);
      setJobTitle(inputJobTitle);
      setCertification(inputCertification);
      setCurrentPage(1);
    }, 400);
  }).current;

  // Load candidates when filters or page change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchCandidates(currentPage, itemsPerPage, searchTerm, company, jobTitle, certification, null, null, true); // myCandidates=true
  }, [currentPage, searchTerm, company, jobTitle, certification, fetchCandidates]);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCandidates(1, itemsPerPage, searchTerm, company, jobTitle, certification, null, null, true); // myCandidates=true
    }
  }, [isOpen]);

  // Handle input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputSearchTerm(val);
    debouncedUpdate();
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputCompany(val);
    debouncedUpdate();
  };

  const handleJobTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputJobTitle(val);
    debouncedUpdate();
  };

  const handleCertificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputCertification(val);
    debouncedUpdate();
  };

  const handleClearFilters = () => {
    setInputSearchTerm("");
    setInputCompany("");
    setInputJobTitle("");
    setInputCertification("");
    resetFilters();
    setCurrentPage(1);
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    onSelectCandidate(candidate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search (Name, Email, Skills)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={inputSearchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search candidates..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={inputCompany}
                onChange={handleCompanyChange}
                placeholder="Filter by company..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={inputJobTitle}
                onChange={handleJobTitleChange}
                placeholder="Filter by job title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Certification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certification
              </label>
              <input
                type="text"
                value={inputCertification}
                onChange={handleCertificationChange}
                placeholder="Filter by certification..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {pagination ? `Showing ${candidates.length} of ${pagination.total_items} candidates` : 'Loading...'}
            </p>
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
              <p className="text-gray-500">
                {inputSearchTerm || inputCompany || inputJobTitle || inputCertification
                  ? "Try adjusting your search criteria"
                  : "No candidates available"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => {
                const workHistory = candidate.work_history || [];
                const currentJob = workHistory.find((exp: any) => exp.is_current);
                const education = candidate.education || [];
                const latestEducation = education.length > 0 ? education[0] : null;
                
                return (
                  <div
                    key={candidate.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => handleSelectCandidate(candidate)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{candidate.full_name}</h3>
                          {candidate.parsing_status?.confidence_score && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              candidate.parsing_status.confidence_score >= 0.8
                                ? 'bg-green-100 text-green-700'
                                : candidate.parsing_status.confidence_score >= 0.6
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {Math.round(candidate.parsing_status.confidence_score * 100)}% confidence
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{candidate.email}</p>
                          {candidate.phone && <p>{candidate.phone}</p>}
                          {candidate.location && <p>{candidate.location}</p>}
                        </div>

                        {/* Current Position */}
                        {currentJob && (
                          <div className="mt-3 flex items-center gap-2 text-sm">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{currentJob.job_title}</span>
                            <span className="text-gray-500">at</span>
                            <span className="text-gray-700">{currentJob.company_name}</span>
                          </div>
                        )}

                        {/* Education */}
                        {latestEducation && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <GraduationCap className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">
                              {latestEducation.degree} {latestEducation.field_of_study && `in ${latestEducation.field_of_study}`}
                            </span>
                            {latestEducation.institution && (
                              <span className="text-gray-500">from {latestEducation.institution}</span>
                            )}
                          </div>
                        )}

                        {/* Skills */}
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 5).map((skill, index) => (
                              <span
                                key={skill.id || index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                              >
                                {skill.skill_name}
                              </span>
                            ))}
                            {candidate.skills.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                                +{candidate.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="p-4 border-t">
            <div className="flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.has_prev_page}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-600">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.has_next_page}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}