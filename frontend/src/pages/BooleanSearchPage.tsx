import { useState } from "react";
import { Search, Info, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../services/api";
import toast from "react-hot-toast";
import BooleanSearchResults from "../components/BooleanSearchResults";

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

interface BooleanSearchResponse {
  success: boolean;
  searchType: string;
  query: string;
  pagination: Pagination;
  candidates: BooleanSearchCandidate[];
}

export default function BooleanSearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BooleanSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(20);

  const handleSearch = async (page: number = 1) => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<BooleanSearchResponse>(
        "/candidates/boolean-search",
        {
          query: query.trim(),
          page,
          limit,
        }
      );

      if (response.data.success) {
        setResults(response.data);
        if (response.data.candidates.length === 0) {
          toast("No candidates found matching your query", { icon: "ℹ️" });
        } else {
          toast.success(
            `Found ${response.data.pagination.total_items} candidate${response.data.pagination.total_items !== 1 ? 's' : ''}`
          );
        }
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        // Parse error from malformed query
        const errorMessage = error.response.data?.message || "Invalid query syntax";
        setError(errorMessage);
        toast.error("Invalid query syntax");
      } else {
        console.error("Error in boolean search:", error);
        toast.error("Failed to search candidates");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    handleSearch(page);
  };

  const handleClear = () => {
    setQuery("");
    setResults(null);
    setError(null);
  };

  return (
    <div className="p-6 min-h-full bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Boolean Search</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Use advanced Boolean operators to find candidates with precision.
        </p>
      </div>

      {/* Search Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <label
          htmlFor="boolean-query"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Boolean Search Query
        </label>
        <textarea
          id="boolean-query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null); // Clear error when user starts typing
          }}
          placeholder='("Frontend Developer" OR "React Developer") AND (React OR Redux OR TypeScript) AND NOT Angular'
          className="w-full h-32 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#f18622] focus:border-[#f18622] font-mono leading-relaxed transition-all"
          disabled={loading}
        />

        {/* Error Message */}
        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Query Syntax Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Syntax Helper */}
        <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Supported Syntax</p>
            <p className="text-sm text-blue-600 mt-1">
              <span className="font-semibold">AND</span> - Both terms must match<br />
              <span className="font-semibold">OR</span> - Either term must match<br />
              <span className="font-semibold">NOT</span> - Exclude candidates with this term<br />
              <span className="font-semibold">"quoted phrases"</span> - Exact phrase matching<br />
              <span className="font-semibold">(parentheses)</span> - Group expressions
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {query.length > 0 ? `${query.length} characters` : "Enter a boolean search query"}
          </p>
          <div className="flex gap-3">
            {(query || results) && (
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => handleSearch(1)}
              disabled={loading || !query.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-[#f18622] hover:bg-[#d9751a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <BooleanSearchResults
          candidates={results.candidates}
          pagination={results.pagination}
          onPageChange={handlePageChange}
          loading={loading}
        />
      )}
    </div>
  );
}