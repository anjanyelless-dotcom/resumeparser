import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubmissionStore } from "../store/useSubmissionStore";
import toast from "react-hot-toast";
import { Search, RefreshCw, User, Briefcase, Calendar, CheckCircle, XCircle, X } from "lucide-react";

export default function ClientSubmissionTrackingPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'shortlisted' | 'rejected'>('shortlisted');
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { fetchSubmissionsForMyClients, updateClientOutcome } = useSubmissionStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, searchTerm, statusFilter]);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSubmissionsForMyClients();
      setSubmissions(data);
    } catch (error) {
      console.error("Failed to load submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.candidate_name.toLowerCase().includes(term) ||
          sub.job_title.toLowerCase().includes(term) ||
          sub.company_name.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    setFilteredSubmissions(filtered);
  };

  const handleRecordDecision = (submission: any) => {
    setSelectedSubmission(submission);
    setSelectedOutcome('shortlisted');
    setNotes("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
    setSelectedOutcome('shortlisted');
    setNotes("");
  };

  const handleSubmitDecision = async () => {
    if (!selectedSubmission) return;

    setIsSubmitting(true);
    try {
      await updateClientOutcome(selectedSubmission.id, selectedOutcome, notes);
      toast.success("Client decision recorded successfully");
      handleCloseModal();
      loadSubmissions(); // Refresh the list
    } catch (error) {
      console.error("Failed to record decision:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any }> = {
      'Shortlisted': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'Rejected': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'Under Review': { color: 'bg-yellow-100 text-yellow-700', icon: Briefcase },
      'Submitted': { color: 'bg-blue-100 text-blue-700', icon: User },
    };

    const config = statusMap[status] || { color: 'bg-gray-100 text-gray-700', icon: User };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Submissions</h1>
            <p className="text-gray-600 mt-1">
              {submissions.length} total submissions from your clients
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search candidates, jobs, or companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Rejected">Rejected</option>
                <option value="Under Review">Under Review</option>
                <option value="Submitted">Submitted</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadSubmissions}
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
            Showing {filteredSubmissions.length} of {submissions.length} submissions
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
        {!isLoading && filteredSubmissions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter
                ? "Try adjusting your search filters"
                : "No submissions have been made for your clients yet"}
            </p>
          </div>
        )}

        {/* Submissions Table */}
        {!isLoading && filteredSubmissions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recruiter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewCandidate(submission.candidate_id)}
                        className="text-left hover:text-indigo-600 focus:outline-none"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {submission.candidate_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {submission.candidate_email}
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{submission.job_title}</div>
                      <div className="text-sm text-gray-500">{submission.job_location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{submission.company_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{submission.submitted_by}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(submission.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRecordDecision(submission)}
                        className="text-indigo-600 hover:text-indigo-900 focus:outline-none"
                      >
                        Record Client Decision
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Client Decision Modal */}
      {isModalOpen && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Record Client Decision</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Candidate:</span> {selectedSubmission.candidate_name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Job:</span> {selectedSubmission.job_title}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Company:</span> {selectedSubmission.company_name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Decision
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="outcome"
                        value="shortlisted"
                        checked={selectedOutcome === 'shortlisted'}
                        onChange={(e) => setSelectedOutcome(e.target.value as 'shortlisted' | 'rejected')}
                        className="mr-3"
                      />
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-sm">Shortlist</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="outcome"
                        value="rejected"
                        checked={selectedOutcome === 'rejected'}
                        onChange={(e) => setSelectedOutcome(e.target.value as 'shortlisted' | 'rejected')}
                        className="mr-3"
                      />
                      <XCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-sm">Reject</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add any notes about this decision..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDecision}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Recording...' : 'Record Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}