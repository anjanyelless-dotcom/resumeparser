import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSubmissionStore } from "../store/useSubmissionStore";
import { 
  Users, 
  Search, 
  RefreshCw, 
  X, 
  Calendar, 
  Building, 
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Video,
  Phone,
  MapPin,
  Send
} from "lucide-react";
export default function ClientReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { mySubmissions, myPagination, isLoading, fetchMySubmissions, updateSubmissionStatus } = useSubmissionStore();
  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectSubmissionId, setRejectSubmissionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const itemsPerPage = 20;

  useEffect(() => {
    fetchMySubmissions(currentPage, itemsPerPage, jobId);
  }, [currentPage, fetchMySubmissions, jobId]);

  const handleStatusUpdate = async (submissionId: string, newStatus: string, rejectionReason?: string) => {
    try {
      await updateSubmissionStatus(submissionId, newStatus, rejectionReason);
    } catch (error) {
      console.error('Failed to update submission status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'waiting_for_client_response':
      case 'client_review':
      case 'under_review':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'client_approved':
      case 'shortlisted':
      case 'shortlisted_by_client':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'client_rejected':
      case 'rejected_by_client':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      case 'waiting_for_client_response':
      case 'client_review':
      case 'under_review':
        return <AlertCircle className="w-4 h-4" />;
      case 'client_approved':
      case 'shortlisted':
      case 'shortlisted_by_client':
        return <CheckCircle className="w-4 h-4" />;
      case 'client_rejected':
      case 'rejected_by_client':
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'withdrawn':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter submissions based on search and status
  const filteredSubmissions = mySubmissions.filter(submission => {
    const matchesSearch = !searchTerm || 
      submission.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.candidate_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.job_company?.toLowerCase().includes(searchTerm.toLowerCase());

    const lowerStatus = (submission.status || '').toLowerCase().replace(/ /g, '_');
    let matchesStatus = true;
    
    if (statusFilter) {
      matchesStatus = lowerStatus === statusFilter.toLowerCase();
    } else {
      // Phase 2: Client Review tab only shows submissions waiting for client feedback
      matchesStatus = ['submitted', 'waiting_for_client_response', 'client_review', 'shortlisted_by_client', 'rejected_by_client'].includes(lowerStatus);
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Client Review</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => fetchMySubmissions(currentPage, itemsPerPage, jobId)}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search-submissions" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="search-submissions"
                  name="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by candidate, job, or company..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Active Submissions</option>
                <option value="draft">Draft</option>
                <option value="ready_to_submit">Ready To Submit</option>
                <option value="submitted">Submitted</option>
                <option value="waiting_for_client_response">Waiting For Client Response</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Tabs - Now only showing the active page title since sub-tabs are removed */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                className="py-2 px-4 border-b-2 font-medium text-sm border-blue-500 text-blue-600"
              >
                Client Review ({myPagination?.total_items || 0})
              </button>
            </nav>
          </div>
        </div>

        {/* Results Count */}
        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {`Showing ${filteredSubmissions.length} of ${(myPagination?.total_items || 0)} submissions`}
          </p>
        </div>

        {/* Tab Content */}
        <>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No submissions found
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter
                    ? "Try adjusting your search criteria"
                    : "Get started by submitting candidates to jobs"}
                </p>
                {!searchTerm && !statusFilter && (
                  <button
                    onClick={() => navigate("/recruiter/requirements")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Your First Candidate
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.candidate_name || (submission.candidate_email ? submission.candidate_email.split('@')[0] : 'Unknown')}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {submission.candidate_email || 'No email'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.job_title || 'Unknown Job'}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {submission.job_company || 'Unknown Company'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(() => {
                              const statusKey = (submission.status || '').toLowerCase().replace(/ /g, '_');
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(statusKey)}`}>
                                  {getStatusIcon(statusKey)}
                                  {(submission.status || '').replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(submission.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {(() => {
                              const statusKey = (submission.status || '').toLowerCase().replace(/ /g, '_');
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  {['submitted', 'waiting_for_client_response', 'client_review'].includes(statusKey) && (
                                    <>
                                      <button
                                        onClick={() => handleStatusUpdate(submission.id, 'shortlisted_by_client')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                                        title="Approve (Shortlist)"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setRejectSubmissionId(submission.id);
                                          setShowRejectModal(true);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                                        title="Reject"
                                      >
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => navigate(`/recruiter/submissions/${submission.id}`)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    title="View Details"
                                  >
                                    View Details
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>

        {/* Pagination */}
        {myPagination && myPagination.total_pages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!myPagination.has_prev_page}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {myPagination.current_page} of {myPagination.total_pages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!myPagination.has_next_page}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject Submission</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!rejectSubmissionId) return;
              await handleStatusUpdate(rejectSubmissionId, 'rejected_by_client', rejectReason || undefined);
              setShowRejectModal(false);
              setRejectSubmissionId(null);
              setRejectReason('');
            }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
