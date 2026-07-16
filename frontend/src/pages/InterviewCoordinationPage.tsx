import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInterviewStore } from "../store/useInterviewStore";
import toast from "react-hot-toast";
import { Calendar, Clock, Video, Phone, Users, RefreshCw, Plus, Edit, CheckCircle, XCircle } from "lucide-react";
import ScheduleInterviewModal from "../components/interviews/ScheduleInterviewModal";
import InterviewFeedback from "../components/interviews/InterviewFeedback";

export default function InterviewCoordinationPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const { getInterviewsForMyClients, createInterview, updateInterview, addInterviewFeedback } = useInterviewStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    setIsLoading(true);
    try {
      const data = await getInterviewsForMyClients();
      setInterviews(data);
    } catch (error) {
      console.error("Failed to load interviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleInterview = () => {
    // For now, we'll need to select a submission first
    // In a full implementation, this would open a submission selector modal
    toast("Select a submission from the Client Submissions page to schedule an interview");
    navigate("/client-manager/submissions");
  };

  const handleSchedule = async (roundName: string, scheduledAt: string, mode: string) => {
    if (!selectedSubmission) return;

    setIsScheduling(true);
    try {
      await createInterview(selectedSubmission.id, roundName, scheduledAt, mode);
      setIsScheduleModalOpen(false);
      setSelectedSubmission(null);
      loadInterviews();
    } catch (error) {
      console.error("Failed to schedule interview:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReschedule = (interview: any) => {
    setSelectedInterview(interview);
    // For simplicity, we'll prompt for new date/time
    const newDate = prompt("Enter new date and time (YYYY-MM-DDTHH:MM):", interview.scheduled_at);
    if (newDate) {
      handleUpdateInterview(interview.id, newDate);
    }
  };

  const handleUpdateInterview = async (interviewId: string, scheduledAt: string) => {
    setIsRescheduling(true);
    try {
      await updateInterview(interviewId, scheduledAt);
      toast.success("Interview rescheduled successfully");
      loadInterviews();
    } catch (error) {
      console.error("Failed to reschedule interview:", error);
    } finally {
      setIsRescheduling(false);
      setSelectedInterview(null);
    }
  };

  const handleFeedbackSubmit = async (outcome: string, notes?: string, rating?: number) => {
    if (!selectedInterview) return;

    try {
      await addInterviewFeedback(selectedInterview.id, outcome, notes, rating);
      setShowFeedback(false);
      setSelectedInterview(null);
      loadInterviews();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in-person':
      case 'on-site':
        return <Users className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any }> = {
      'scheduled': { color: 'bg-blue-100 text-blue-700', icon: Calendar },
      'completed': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'cancelled': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'no_show': { color: 'bg-gray-100 text-gray-700', icon: Clock },
    };

    const config = statusMap[status] || { color: 'bg-gray-100 text-gray-700', icon: Calendar };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const isPastInterview = (scheduledAt: string) => {
    return new Date(scheduledAt) < new Date();
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Coordination</h1>
            <p className="text-gray-600 mt-1">
              {interviews.length} total interviews across your clients
            </p>
          </div>
          <button
            onClick={handleScheduleInterview}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Schedule Interview
          </button>
        </div>

        {/* Refresh Button */}
        <div className="mb-6">
          <button
            onClick={loadInterviews}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {isLoading && interviews.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading interviews...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && interviews.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
            <p className="text-gray-600">
              No interviews have been scheduled for your clients yet
            </p>
          </div>
        )}

        {/* Interviews List */}
        {!isLoading && interviews.length > 0 && (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{interview.round_name}</h3>
                      {getStatusBadge(interview.status)}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(interview.scheduled_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        {getModeIcon(interview.mode)}
                        <span className="capitalize">{interview.mode}</span>
                      </div>
                      {interview.job_title && (
                        <div className="flex items-center gap-1">
                          <span>📋</span>
                          {interview.job_title}
                        </div>
                      )}
                      {interview.candidate_name && (
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          {interview.candidate_name}
                        </div>
                      )}
                    </div>

                    {interview.feedback && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">Feedback:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                            interview.feedback.outcome === 'pass' ? 'bg-green-100 text-green-700' :
                            interview.feedback.outcome === 'fail' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {interview.feedback.outcome.charAt(0).toUpperCase() + interview.feedback.outcome.slice(1)}
                          </span>
                          {interview.feedback.rating && (
                            <span className="text-gray-600">({interview.feedback.rating}/5)</span>
                          )}
                        </div>
                        {interview.feedback.notes && (
                          <p className="text-sm text-gray-600 mt-1">{interview.feedback.notes}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {interview.status === 'scheduled' && !isPastInterview(interview.scheduled_at) && (
                      <button
                        onClick={() => handleReschedule(interview)}
                        disabled={isRescheduling}
                        className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit className="w-3 h-3" />
                        Reschedule
                      </button>
                    )}
                    {!interview.feedback && interview.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setSelectedInterview(interview);
                          setShowFeedback(true);
                        }}
                        className="px-3 py-1.5 text-sm border border-green-300 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Add Feedback
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback Form */}
                {showFeedback && selectedInterview && selectedInterview.id === interview.id && (
                  <div className="mt-4 pt-4 border-t">
                    <InterviewFeedback
                      onSubmit={handleFeedbackSubmit}
                      isSubmitting={false}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedSubmission(null);
        }}
        onSchedule={handleSchedule}
        isScheduling={isScheduling}
      />
    </div>
  );
}