import { useState, useEffect } from "react";
import { useSubmissionReviewStore } from "../../store/useSubmissionReviewStore";
import { RefreshCw, User, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import CandidateProfile from "../../components/candidates/CandidateProfile";
import toast from "react-hot-toast";
import { apiClient } from "../../services/api/client";

export default function ShortlistReviewPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { submissions, pagination, isLoading, fetchPendingSubmissions } = useSubmissionReviewStore();
  const [isForwarding, setIsForwarding] = useState<string | null>(null);

  const itemsPerPage = 20;

  useEffect(() => {
    loadSubmissions();
  }, [currentPage]);

  const loadSubmissions = async () => {
    // Fetch submissions that are Under Review or Shortlisted
    await fetchPendingSubmissions({
      page: currentPage,
      limit: itemsPerPage,
      status: "shortlisted",
    });
  };

  const toggleRowExpansion = (submissionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedRows(newExpanded);
  };

  const handleForwardToClient = async (submissionId: string) => {
    setIsForwarding(submissionId);
    try {
      await apiClient.post(`/submissions/${submissionId}/forward-client`);
      toast.success("Successfully forwarded candidate to client manager!");
      loadSubmissions();
    } catch (error) {
      toast.error("Failed to forward to client");
    } finally {
      setIsForwarding(null);
    }
  };

  // Group submissions by job
  const groupedSubmissions = submissions.reduce((acc: any, sub: any) => {
    if (!acc[sub.job_title]) {
      acc[sub.job_title] = [];
    }
    acc[sub.job_title].push(sub);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shortlist Review</h1>
          <p className="text-gray-600 mt-1">Review approved candidates before final client batch</p>
        </div>
        <button
          onClick={loadSubmissions}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-white"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading && submissions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600">Loading shortlists...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shortlisted candidates</h3>
          <p className="text-gray-600">There are no candidates waiting for final client forward.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSubmissions).map(([jobTitle, subs]: [string, any]) => (
            <div key={jobTitle} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-indigo-50 px-6 py-4 border-b border-gray-200 flex items-center">
                <Briefcase className="w-5 h-5 text-indigo-600 mr-3" />
                <h2 className="text-lg font-bold text-indigo-900">Requirement: {jobTitle}</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {subs.map((sub: any) => (
                  <div key={sub.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Candidate</p>
                        <p className="font-bold text-gray-900">{sub.candidate_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">AI Score</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          95% {/* Replace with actual AI Score if available in backend payload */}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Experience</p>
                        <p className="font-medium text-gray-900">6 Years</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Recruiter</p>
                        <p className="font-medium text-gray-900">{sub.recruiter_info?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Interview</p>
                        <p className="font-medium text-amber-600">Pending</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button 
                        onClick={() => handleForwardToClient(sub.id)}
                        disabled={isForwarding === sub.id}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center"
                      >
                        {isForwarding === sub.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Forward To Client
                      </button>
                      <button 
                        onClick={() => toggleRowExpansion(sub.id)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors flex items-center"
                      >
                        {expandedRows.has(sub.id) ? (
                          <>Hide Candidate <ChevronUp className="w-4 h-4 ml-1" /></>
                        ) : (
                          <>View Candidate <ChevronDown className="w-4 h-4 ml-1" /></>
                        )}
                      </button>
                    </div>

                    {expandedRows.has(sub.id) && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <CandidateProfile candidateId={sub.candidate_id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={!pagination.has_prev_page}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.current_page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pagination.total_pages, p + 1))}
            disabled={!pagination.has_next_page}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
