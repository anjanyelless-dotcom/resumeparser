import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubmissionStore } from "../store/useSubmissionStore";
import { useInterviewStore } from "../store/useInterviewStore";
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
  MapPin
} from "lucide-react";
import ScheduleInterviewModal from "../components/interviews/ScheduleInterviewModal";
import InterviewFeedback from "../components/interviews/InterviewFeedback";

export default function RecruiterSubmissionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"submissions" | "interviews">("submissions");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { mySubmissions, myPagination, isLoading, fetchMySubmissions, updateSubmissionStatus } = useSubmissionStore();
  const { 
    interviews, 
    getInterviewsBySubmission, 
    createInterview, 
    addInterviewFeedback, 
    isScheduling, 
    isSubmittingFeedback 
  } = useInterviewStore();
  const navigate = useNavigate();

  const itemsPerPage = 20;

  // Load submissions when page or filters change
  useEffect(() => {
    fetchMySubmissions(currentPage, itemsPerPage);
  }, [currentPage, fetchMySubmissions]);

  // Load interviews when submissions are loaded
  useEffect(() => {
    if (mySubmissions.length > 0) {
      // Load interviews for all submissions
      const loadAllInterviews = async () => {
        for (const submission of mySubmissions) {
          try {
            await getInterviewsBySubmission(submission.id);
          } catch (error) {
            console.warn('Failed to load interviews for submission:', submission.id);
          }
        }
      };
      loadAllInterviews();
    }
  }, [mySubmissions, getInterviewsBySubmission]);

  const handleStatusUpdate = async (submissionId: string, newStatus: string, rejectionReason?: string) => {
    try {
      await updateSubmissionStatus(submissionId, newStatus, rejectionReason);
    } catch (error) {
      console.error('Failed to update submission status:', error);
    }
  };

  const handleScheduleInterview = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setShowScheduleModal(true);
  };

  const handleCreateInterview = async (roundName: string, scheduledAt: string, mode: string) => {
    if (!selectedSubmissionId) return;
    
    try {
      await createInterview(selectedSubmissionId, roundName, scheduledAt, mode);
      setShowScheduleModal(false);
      setSelectedSubmissionId(null);
      // Refresh interviews for this submission
      await getInterviewsBySubmission(selectedSubmissionId);
    } catch (error) {
      console.error('Failed to schedule interview:', error);
    }
  };

  const handleAddFeedback = async (outcome: string, notes?: string, rating?: number) => {
    try {
      const currentInterview = interviews.find(i => i.feedback === undefined);
      if (currentInterview) {
        await addInterviewFeedback(currentInterview.id, outcome, notes, rating);
      }
    } catch (error) {
      console.error('Failed to add interview feedback:', error);
    }
  };

  const getInterviewModeIcon = (mode: string) => {
    switch (mode) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
      case 'on-site':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const isInterviewPast = (scheduledAt: string) => {
    return new Date(scheduledAt) < new Date();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
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

    const matchesStatus = !statusFilter || submission.status === statusFilter;

    return matchesSearch && matchesStatus;
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
                <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
                <p className="text-sm text-gray-500">Candidates you've submitted to jobs</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/recruiter/requirements")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit More Candidates
              </button>
              <button
                onClick={() => fetchMySubmissions(currentPage, itemsPerPage)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
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
                <option value="">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("submissions")}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === "submissions"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Submissions ({myPagination?.total_items || 0})
              </button>
              <button
                onClick={() => setActiveTab("interviews")}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === "interviews"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Interviews ({interviews.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {activeTab === "submissions" 
              ? `Showing ${filteredSubmissions.length} of ${myPagination?.total_items || 0} submissions`
              : `Showing ${interviews.length} interviews`
            }
          </p>
        </div>

        {/* Tab Content */}
        {activeTab === "submissions" ? (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.candidate_name || 'Unknown'}
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
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(submission.status)}`}>
                              {getStatusIcon(submission.status)}
                              {submission.status.replace('_', ' ').charAt(0).toUpperCase() + submission.status.slice(1).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(submission.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {submission.status === 'submitted' && (
                                <>
                                  <button
                                    onClick={() => handleStatusUpdate(submission.id, 'under_review')}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    Mark Under Review
                                  </button>
                                  <button
                                    onClick={() => handleScheduleInterview(submission.id)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Schedule Interview
                                  </button>
                                </>
                              )}
                              {submission.status === 'under_review' && (
                                <>
                                  <button
                                    onClick={() => handleStatusUpdate(submission.id, 'accepted')}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Rejection reason (optional):');
                                      if (reason !== null) {
                                        handleStatusUpdate(submission.id, 'rejected', reason);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Interviews Tab */
          <>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews scheduled</h3>
                <p className="text-gray-500 mb-4">
                  Schedule interviews for your submissions to track them here
                </p>
                <button
                  onClick={() => navigate("/recruiter/requirements")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Submissions
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.map((interview) => (
                  <div key={interview.id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">{interview.round_name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
                            interview.status === 'scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            interview.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                            interview.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{interview.candidate_name}</span>
                            <span>•</span>
                            <span>{interview.job_title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateTime(interview.scheduled_at)}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              {getInterviewModeIcon(interview.mode)}
                              <span>{interview.mode}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {interview.status === 'scheduled' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newTime = prompt('Reschedule to (YYYY-MM-DD HH:MM):');
                              if (newTime) {
                                // Handle reschedule
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Cancel this interview?')) {
                                // Handle cancel
                              }
                            }}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Feedback Section */}
                    {isInterviewPast(interview.scheduled_at) && (
                      <InterviewFeedback
                        existingFeedback={interview.feedback}
                        onSubmit={handleAddFeedback}
                        isSubmitting={isSubmittingFeedback}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

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

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedSubmissionId(null);
        }}
        onSchedule={handleCreateInterview}
        isScheduling={isScheduling}
      />
    </div>
    </div>
  );
}
