import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import FilterBuilder from "../components/FilterBuilder";
import type { FilterCriteria } from "../components/FilterBuilder";
import CandidateResults from "../components/CandidateResults";
import { Search, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

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

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface SearchResponse {
  success: boolean;
  searchType: string;
  criteria: FilterCriteria;
  pagination: Pagination;
  candidates: ScoredCandidate[];
  externalCandidates?: ExternalCandidatesData;
}

export default function CandidateFilterSearch() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [results, setResults] = useState<ScoredCandidate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20,
    has_next_page: false,
    has_prev_page: false,
  });
  const [externalCandidates, setExternalCandidates] = useState<ExternalCandidatesData | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [emptySearchAttempted, setEmptySearchAttempted] = useState(false);

  const isFiltersEmpty = (criteria: FilterCriteria) => {
    return !criteria.role && 
           (!criteria.skills || criteria.skills.length === 0) &&
           criteria.minExperience === undefined &&
           criteria.maxExperience === undefined &&
           (!criteria.locations || criteria.locations.length === 0) &&
           (!criteria.education || criteria.education.length === 0) &&
           (!criteria.noticePeriod || criteria.noticePeriod.length === 0) &&
           (!criteria.currentCompany || criteria.currentCompany.length === 0) &&
           (!criteria.employmentType || criteria.employmentType.length === 0) &&
           !criteria.manualLocation &&
           !criteria.manualCompany &&
           !criteria.manualEducation;
  };

  const handleSearch = async (page: number = 1) => {
    if (isFiltersEmpty(filters)) {
      setEmptySearchAttempted(true);
      setSearched(false);
      return;
    }
    
    setEmptySearchAttempted(false);
    try {
      setLoading(true);
      const response = await api.post<SearchResponse>("/candidates/search/filters", {
        ...filters,
        page,
        limit: 20,
      });

      setResults(response.data.candidates);
      setPagination(response.data.pagination);
      setExternalCandidates(response.data.externalCandidates);
      setSearched(true);
    } catch (error: any) {
      console.error("Search failed:", error);
      toast.error(
        error.response?.data?.message || "Failed to search candidates"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    handleSearch(page);
  };

  const handleImportedCandidate = (candidate: ScoredCandidate) => {
    setResults((prev) => [candidate, ...prev]);
    setPagination((prev) => ({
      ...prev,
      total_items: prev.total_items + 1,
    }));
  };

  const handleReset = () => {
    setFilters({});
    setResults([]);
    setSearched(false);
    setPagination({
      current_page: 1,
      total_pages: 1,
      total_items: 0,
      items_per_page: 20,
      has_next_page: false,
      has_prev_page: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Search Candidates by Filters
              </h1>
              <p className="text-sm text-slate-600">
                Find candidates using structured filters instead of pasting a JD
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 p-6">
        {/* Filter Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            <FilterBuilder filters={filters} onChange={setFilters} />
            
            {/* Search Button */}
            <button
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 font-medium text-white transition hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Search Candidates
                </>
              )}
            </button>

            {/* Reset Button */}
            {searched && (
              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1">
          {searched ? (
            <CandidateResults
              candidates={results}
              pagination={pagination}
              onPageChange={handlePageChange}
              loading={loading}
              externalCandidates={externalCandidates}
              onImportedCandidate={handleImportedCandidate}
              searchRole={filters.role}
              searchSkills={filters.skills}
            />
          ) : emptySearchAttempted ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center">
              <Search className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No Candidates to Display
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Select one or more search filters and click "Search Candidates" to find matching candidates.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center">
              <Search className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Start Your Search
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Select filters from the sidebar and click "Search Candidates" to find
                matching candidates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
