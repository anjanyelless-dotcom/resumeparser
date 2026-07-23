import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCandidateStore } from "../store/useCandidateStore";
import { useFilterStore } from "../store/filterStore";
import { Users, Search, RefreshCw, X } from "lucide-react";
import CandidateCard from "../components/candidates/CandidateCard";



type FilterType = "all" | "high-confidence" | "needs-review";
type SortType = "date-added" | "name" | "confidence-score" | "match-score";

export default function RecruiterCandidatesPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("date-added");
  const [currentPage, setCurrentPage] = useState(1);
  
  const { candidates, pagination, isLoading, fetchCandidates } = useCandidateStore();
  const { searchTerm, company, jobTitle, certification, salaryMin, salaryMax, setSearchTerm, setCompany, setJobTitle, setCertification, resetFilters } = useFilterStore();
  const navigate = useNavigate();

  // Local input state — holds raw typed values before debounce commits them
  const [inputSearchTerm, setInputSearchTerm] = useState(searchTerm || "");
  const [inputCompany, setInputCompany] = useState(company || "");
  const [inputJobTitle, setInputJobTitle] = useState(jobTitle || "");
  const [inputCertification, setInputCertification] = useState(certification || "");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const itemsPerPage = 20;

  

  // Debounced filter updates
  const debouncedUpdate = useRef(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setCompany(inputCompany);
      setJobTitle(inputJobTitle);
      setCertification(inputCertification);
      setCurrentPage(1); // Reset to first page when filters change
    }, 400);
  }).current;

  // Load candidates when filters or page change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchCandidates(currentPage, itemsPerPage, searchTerm, company, jobTitle, certification, salaryMin, salaryMax, true); // myCandidates=true for recruiters
  }, [currentPage, searchTerm, company, jobTitle, certification, salaryMin, salaryMax, fetchCandidates]);

  // Initial load
  useEffect(() => {
    fetchCandidates(1, itemsPerPage, searchTerm, company, jobTitle, certification, salaryMin, salaryMax, true); // myCandidates=true for recruiters
  }, []);

  // Handle input changes with validation
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

  const handleRefresh = () => {
    fetchCandidates(currentPage, itemsPerPage, searchTerm, company, jobTitle, certification, salaryMin, salaryMax, true);
  };

  const handleClearFilters = () => {
    setInputSearchTerm("");
    setInputCompany("");
    setInputJobTitle("");
    setInputCertification("");
    resetFilters();
    setCurrentPage(1);
  };

  // Filter candidates based on local filter state
  const filteredCandidates = candidates.filter((candidate) => {
    if (filter === "high-confidence") {
      return (candidate.parsing_status?.confidence_score ?? 0) >= 0.8;
    }
    if (filter === "needs-review") {
      return candidate.parsing_status?.status === "failed" || (candidate.parsing_status?.confidence_score ?? 0) < 0.5;
    }
    return true;
  });

  // Sort candidates
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    switch (sort) {
      case "name":
        return (a.full_name || "").localeCompare(b.full_name || "");
      case "confidence-score":
        return (b.parsing_status?.confidence_score ?? 0) - (a.parsing_status?.confidence_score ?? 0);
      case "match-score":
        return (b.match_score ?? 0) - (a.match_score ?? 0);
      case "date-added":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Candidates</h1>
                <p className="text-sm text-gray-500">Candidates you've added to the system</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/upload")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Candidate
              </button>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search by Name, Email, or Skills */}
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

            {/* Company Filter */}
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

            {/* Job Title Filter */}
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

            {/* Certification Filter */}
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

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Filter Type */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Filter:</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Candidates</option>
                  <option value="high-confidence">High Confidence</option>
                  <option value="needs-review">Needs Review</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Sort:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortType)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date-added">Date Added</option>
                  <option value="name">Name</option>
                  <option value="confidence-score">Confidence Score</option>
                  <option value="match-score">Match Score</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={handleClearFilters}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {sortedCandidates.length} of {pagination?.total_items || 0} candidates
          </p>
        </div>

        {/* Candidates Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : sortedCandidates.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || company || jobTitle || certification
                ? "Try adjusting your search criteria"
                : "Get started by uploading your first resume"}
            </p>
            {!searchTerm && !company && !jobTitle && !certification && (
              <button
                onClick={() => navigate("/upload")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Resume
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCandidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-8 flex justify-center">
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
        )}
      </div>
    </div>
  );
}