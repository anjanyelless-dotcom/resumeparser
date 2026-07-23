import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { Users, Search, RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";
import DuplicateReviewModal from "../components/DuplicateReviewModal";

export default function DuplicateReviewPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDuplicate, setSelectedDuplicate] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);

  // Local input state — holds raw typed values before debounce commits them
  const [inputSearchTerm, setInputSearchTerm] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const itemsPerPage = 20;

  // Debounce: commit local inputs to filter state 400 ms after the user stops typing
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setCurrentPage(1);
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputSearchTerm]);

  // Fetch duplicates when filters or pagination change
  useEffect(() => {
    loadDuplicates();
  }, [currentPage, searchTerm]);

  const loadDuplicates = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (currentPage) queryParams.append('page', currentPage.toString());
      queryParams.append('limit', itemsPerPage.toString());

      const response = await api.get(`/candidates/duplicates?${queryParams.toString()}`);
      setDuplicates(response.data.duplicates || []);
      setPagination(response.data.pagination || null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to fetch duplicates";
      toast.error(errorMessage);
      setDuplicates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async (_primaryId: string, _duplicateId: string) => {
    await loadDuplicates();
  };

  const handleIgnore = async (_duplicateId: string) => {
    await loadDuplicates();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-red-600 bg-red-50";
    if (score >= 80) return "text-orange-600 bg-orange-50";
    if (score >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Duplicate Candidates Review</h1>
            <p className="text-gray-600 mt-1">
              {pagination?.total_items || 0} duplicate pairs to review
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search duplicates by name or email..."
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadDuplicates}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {duplicates.length} of {pagination?.total_items || 0} duplicate pairs
            {pagination && ` (Page ${pagination.current_page} of ${pagination.total_pages})`}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && duplicates.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading duplicates...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && duplicates.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No duplicates found</h3>
            <p className="text-gray-600">
              {searchTerm
                ? "Try adjusting your search filters"
                : "All duplicates have been reviewed"}
            </p>
          </div>
        )}

        {/* Duplicates List */}
        {!isLoading && duplicates.length > 0 && (
          <div className="space-y-4">
            {duplicates.map((duplicate: any) => (
              <div
                key={duplicate.duplicate_relationship_id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        <h3 className="font-medium text-gray-900">
                          {duplicate.candidate_1_name} & {duplicate.candidate_2_name}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getScoreColor(duplicate.similarity_score)}`}>
                        {duplicate.similarity_score}% match
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Candidate 1</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{duplicate.candidate_1_name}</p>
                          <span className="text-gray-400">({duplicate.candidate_1_email})</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Candidate 2</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{duplicate.candidate_2_name}</p>
                          <span className="text-gray-400">({duplicate.candidate_2_email})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDuplicate(duplicate)}
                    className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center gap-2"
                  >
                    Review
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600">
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={!pagination.has_prev_page}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, pagination.total_pages) }).map((_, idx) => {
                let pageNum;
                if (pagination.total_pages <= 5) {
                  pageNum = idx + 1;
                } else if (pagination.current_page <= 3) {
                  pageNum = idx + 1;
                } else if (pagination.current_page >= pagination.total_pages - 2) {
                  pageNum = pagination.total_pages - 4 + idx;
                } else {
                  pageNum = pagination.current_page - 2 + idx;
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      pageNum === pagination.current_page
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(pagination.total_pages, prev + 1))}
                disabled={!pagination.has_next_page}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Duplicate Review Modal */}
        <DuplicateReviewModal
          open={!!selectedDuplicate}
          onClose={() => setSelectedDuplicate(null)}
          duplicateGroup={selectedDuplicate}
          onMerge={handleMerge}
          onIgnore={handleIgnore}
        />
      </div>
    </div>
  );
}