import React, { useState, useEffect } from "react";
import { useSubmissionReviewStore } from "../store/useSubmissionReviewStore";
import ReviewSubmissionModal from "../components/team/ReviewSubmissionModal";
import CandidateProfile from "../components/candidates/CandidateProfile";
import { RefreshCw, ChevronDown, ChevronUp, User, Calendar } from "lucide-react";

export default function SubmissionReviewPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"shortlisted" | "submitted">("submitted");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  const { submissions, pagination, isLoading, fetchPendingSubmissions, reviewSubmission } = useSubmissionReviewStore();

  const itemsPerPage = 20;

  // Fetch submissions when page or tab changes
  useEffect(() => {
    loadSubmissions();
  }, [currentPage, activeTab]);

  const loadSubmissions = async () => {
    await fetchPendingSubmissions({
      page: currentPage,
      limit: itemsPerPage,
      status: activeTab,
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

  const handleReview = (submission: any) => {
    setSelectedSubmission(submission);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (submissionId: string, decision: string, notes: string) => {
    await reviewSubmission(submissionId, decision, notes);
    // Remove from expanded rows after review
    const newExpanded = new Set(expandedRows);
    newExpanded.delete(submissionId);
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
            <p className="text-gray-600 mt-1">
              {pagination?.total_items || 0} submissions in {activeTab === "submitted" ? "Pending Review" : "Shortlisted"}
            </p>
          </div>
          <button
            onClick={loadSubmissions}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => { setActiveTab("submitted"); setCurrentPage(1); }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "submitted"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pending Reviews
            </button>
            <button
              onClick={() => { setActiveTab("shortlisted"); setCurrentPage(1); }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "shortlisted"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Shortlisted Candidates
            </button>
          </nav>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {submissions.length} of {pagination?.total_items || 0} submissions
            {pagination && ` (Page ${pagination.current_page} of ${pagination.total_pages})`}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && submissions.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading submissions...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && submissions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending submissions</h3>
            <p className="text-gray-600">
              All submissions have been reviewed
            </p>
          </div>
        )}

        {/* Submissions Table */}
        {!isLoading && submissions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AI Match
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <React.Fragment key={submission.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {submission.candidate_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.candidate_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {submission.job_title}
                            </div>
                            {submission.department && (
                              <div className="text-sm text-gray-500">
                                {submission.department}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {submission.recruiter_info?.name || 'Unknown Recruiter'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.recruiter_info?.email || 'No email'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(submission.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleRowExpansion(submission.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {expandedRows.has(submission.id) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReview(submission)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                            >
                              Review
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(submission.id) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="mb-2 text-sm font-medium text-gray-700">
                              Candidate Details
                            </div>
                            <CandidateProfile candidateId={submission.candidate_id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={!pagination.has_prev_page}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={!pagination.has_next_page}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <ReviewSubmissionModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedSubmission(null);
          }}
          submissionId={selectedSubmission.id}
          candidateName={selectedSubmission.candidate_name}
          jobTitle={selectedSubmission.job_title}
          onReview={handleReviewSubmit}
        />
      )}
    </div>
  );
}