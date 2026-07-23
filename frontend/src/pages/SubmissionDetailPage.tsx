import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { ArrowLeft, User, Briefcase, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Submission {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  candidate_experience?: number;
  job_id: string;
  job_title: string;
  job_department?: string;
  job_location?: string;
  client_name?: string;
  status: string;
  submitted_at: string;
  submitted_by?: string;
}

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [placementData, setPlacementData] = useState({ joining_date: '', placement_fee: '', notes: '' });

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsLoading(true);
      await api.patch(`/submissions/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      await fetchSubmissionDetails(id!);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
      setIsLoading(false);
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await api.post(`/placements/${id}`, {
        ...placementData,
        placement_fee: placementData.placement_fee ? parseFloat(placementData.placement_fee) : null
      });
      toast.success("Placement created successfully");
      setShowPlacementModal(false);
      await fetchSubmissionDetails(id!);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create placement");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSubmissionDetails(id);
    }
  }, [id]);

  const fetchSubmissionDetails = async (submissionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/submissions/${submissionId}`);
      setSubmission(response.data.submission || response.data);
    } catch (error: any) {
      console.error("Failed to fetch submission details:", error);
      setError(error.response?.data?.message || "Failed to load submission details");
      toast.error("Failed to load submission details");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      submitted: {
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: <Clock className="w-4 h-4" />,
        label: "Submitted"
      },
      "under review": {
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: <Clock className="w-4 h-4" />,
        label: "Under Review"
      },
      shortlisted: {
        color: "bg-green-100 text-green-800 border-green-300",
        icon: <CheckCircle className="w-4 h-4" />,
        label: "Shortlisted"
      },
      rejected: {
        color: "bg-red-100 text-red-800 border-red-300",
        icon: <XCircle className="w-4 h-4" />,
        label: "Rejected"
      },
      "offer extended": {
        color: "bg-purple-100 text-purple-800 border-purple-300",
        icon: <CheckCircle className="w-4 h-4" />,
        label: "Offer Extended"
      },
      "offer accepted": {
        color: "bg-emerald-100 text-emerald-800 border-emerald-300",
        icon: <CheckCircle className="w-4 h-4" />,
        label: "Offer Accepted"
      },
      "offer declined": {
        color: "bg-red-100 text-red-800 border-red-300",
        icon: <XCircle className="w-4 h-4" />,
        label: "Offer Declined"
      },
      joined: {
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: <CheckCircle className="w-4 h-4" />,
        label: "Joined"
      },
      placed: {
        color: "bg-emerald-100 text-emerald-800 border-emerald-300",
        icon: <CheckCircle className="w-4 h-4" />,
        label: "Placed"
      }
    };

    const statusInfo = statusMap[status.toLowerCase()] || {
      color: "bg-gray-100 text-gray-800 border-gray-300",
      icon: <AlertCircle className="w-4 h-4" />,
      label: status
    };

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
        {statusInfo.icon}
        {statusInfo.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Submission</h2>
        <p className="text-gray-600 mb-4">{error || "Submission not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Submissions
          </button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Submission Details</h1>
              <p className="text-gray-600 mt-1">View detailed information about this candidate submission</p>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(submission.status)}
              
              {/* Lifecycle Actions */}
              <div className="flex flex-wrap items-center gap-2 border-l pl-4 border-gray-200">
                {submission.status === 'interview_completed' && (
                  <button onClick={() => handleStatusUpdate('Offer Extended')} className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">Extend Offer</button>
                )}
                {submission.status === 'Offer Extended' && (
                  <>
                    <button onClick={() => handleStatusUpdate('Offer Accepted')} className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">Accept Offer</button>
                    <button onClick={() => handleStatusUpdate('Offer Declined')} className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Decline Offer</button>
                  </>
                )}
                {submission.status === 'Offer Accepted' && (
                  <button onClick={() => handleStatusUpdate('Joined')} className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">Mark as Joined</button>
                )}
                {submission.status === 'Joined' && (
                  <button onClick={() => setShowPlacementModal(true)} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Create Placement</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Candidate & Job Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Candidate Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900 font-medium">{submission.candidate_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{submission.candidate_email}</p>
                </div>
                {submission.candidate_phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{submission.candidate_phone}</p>
                  </div>
                )}
                {submission.candidate_experience !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                    <p className="text-gray-900">{submission.candidate_experience} years</p>
                  </div>
                )}
              </div>
            </div>

            {/* Job Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Briefcase className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Job Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <p className="text-gray-900 font-medium">{submission.job_title}</p>
                </div>
                {submission.job_department && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <p className="text-gray-900">{submission.job_department}</p>
                  </div>
                )}
                {submission.job_location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900">{submission.job_location}</p>
                  </div>
                )}
                {submission.client_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <p className="text-gray-900">{submission.client_name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Timeline */}
          <div className="space-y-6">
            {/* Submission Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Submission Info</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submitted On</label>
                  <p className="text-gray-900">
                    {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {submission.submitted_by && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submitted By</label>
                    <p className="text-gray-900">{submission.submitted_by}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submission ID</label>
                  <p className="text-gray-900 font-mono text-sm">{submission.id}</p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Status Timeline</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Submitted</p>
                    <p className="text-xs text-gray-500">
                      {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                {/* Additional timeline items can be added here based on status history */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placement Modal */}
      {showPlacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Placement</h2>
            <form onSubmit={handleCreatePlacement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                <input
                  type="date"
                  required
                  value={placementData.joining_date}
                  onChange={(e) => setPlacementData({ ...placementData, joining_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placement Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={placementData.placement_fee}
                  onChange={(e) => setPlacementData({ ...placementData, placement_fee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  placeholder="e.g. 5000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={placementData.notes}
                  onChange={(e) => setPlacementData({ ...placementData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  rows={3}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPlacementModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Confirm Placement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}