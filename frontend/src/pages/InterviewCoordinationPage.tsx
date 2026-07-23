import { useState, useEffect } from "react";
import { useInterviewStore } from "../store/useInterviewStore";
import { useSubmissionStore } from "../store/useSubmissionStore";
import toast from "react-hot-toast";
import {
  Calendar, Clock, Video, Phone, Users, RefreshCw, Plus,
  Edit2, CheckCircle, XCircle, X, ChevronDown
} from "lucide-react";
import InterviewFeedback from "../components/interviews/InterviewFeedback";

export default function InterviewCoordinationPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleInterviewId, setRescheduleInterviewId] = useState<string | null>(null);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    submission_id: "",
    round_name: "",
    scheduled_at: "",
    mode: "video"
  });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  const { getInterviewsForMyClients, createInterview, updateInterview, addInterviewFeedback, isSubmittingFeedback } =
    useInterviewStore();
  const { mySubmissions, fetchMySubmissions } = useSubmissionStore();

  useEffect(() => {
    loadInterviews();
    // Load submissions for the schedule modal dropdown
    fetchMySubmissions(1, 100);
  }, []);

  useEffect(() => {
    // Only allow scheduling for candidates who are Client Approved or already Interviewing
    const approvedSubmissions = mySubmissions.filter(sub => {
      const statusKey = (sub.status || '').toLowerCase().replace(/ /g, '_');
      return ['client_approved', 'shortlisted_by_client', 'interviewing', 'interview_passed'].includes(statusKey);
    });
    setSubmissions(approvedSubmissions);
  }, [mySubmissions]);

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

  // Open the schedule modal
  const handleOpenScheduleModal = () => {
    setScheduleForm({ submission_id: "", round_name: "", scheduled_at: "", mode: "video" });
    setIsScheduleModalOpen(true);
  };

  // Submit the schedule form
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.submission_id) {
      toast.error("Please select a submission");
      return;
    }
    if (!scheduleForm.round_name) {
      toast.error("Please enter a round name");
      return;
    }
    if (!scheduleForm.scheduled_at) {
      toast.error("Please select a date and time");
      return;
    }
    setIsScheduling(true);
    try {
      await createInterview(
        scheduleForm.submission_id,
        scheduleForm.round_name,
        scheduleForm.scheduled_at,
        scheduleForm.mode
      );
      setIsScheduleModalOpen(false);
      loadInterviews();
    } catch (error) {
      // Error toast handled by store
    } finally {
      setIsScheduling(false);
    }
  };

  // Open reschedule modal
  const handleOpenReschedule = (interview: any) => {
    setRescheduleInterviewId(interview.id);
    setRescheduleDate(interview.scheduled_at?.slice(0, 16) || "");
    setShowRescheduleModal(true);
  };

  // Submit reschedule
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleInterviewId || !rescheduleDate) return;
    try {
      await updateInterview(rescheduleInterviewId, rescheduleDate);
      setShowRescheduleModal(false);
      loadInterviews();
    } catch (error) {
      // Error toast handled by store
    }
  };

  const handleFeedbackSubmit = async (outcome: string, notes?: string, rating?: number) => {
    if (!showFeedback) return;
    try {
      await addInterviewFeedback(showFeedback, outcome, notes, rating);
      setShowFeedback(null);
      loadInterviews();
    } catch (error) {
      // Error toast handled by store
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "video": return <Video className="w-4 h-4" />;
      case "phone": return <Phone className="w-4 h-4" />;
      case "in-person":
      case "on-site": return <Users className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; Icon: any }> = {
      scheduled: { color: "bg-blue-100 text-blue-700", Icon: Calendar },
      completed: { color: "bg-green-100 text-green-700", Icon: CheckCircle },
      cancelled: { color: "bg-red-100 text-red-700", Icon: XCircle },
      no_show: { color: "bg-gray-100 text-gray-700", Icon: Clock },
    };
    const cfg = map[status] || { color: "bg-gray-100 text-gray-700", Icon: Calendar };
    const Icon = cfg.Icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${cfg.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </span>
    );
  };

  // Tomorrow's date for min constraint
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Coordination</h1>
            <p className="text-gray-600 mt-1">{interviews.length} total interviews</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadInterviews}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleOpenScheduleModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Schedule Interview
            </button>
          </div>
        </div>

        {/* Loading */}
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
            <p className="text-gray-600 mb-4">No interviews have been scheduled yet</p>
            <button
              onClick={handleOpenScheduleModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Schedule First Interview
            </button>
          </div>
        )}

        {/* Interviews List */}
        {interviews.length > 0 && (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{interview.round_name}</h3>
                      {getStatusBadge(interview.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(interview.scheduled_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        {getModeIcon(interview.mode)}
                        <span className="capitalize">{interview.mode?.replace("-", " ")}</span>
                      </span>
                      {interview.job_title && (
                        <span className="flex items-center gap-1">📋 {interview.job_title}</span>
                      )}
                      {interview.candidate_name && (
                        <span className="flex items-center gap-1">👤 {interview.candidate_name}</span>
                      )}
                    </div>

                    {/* Feedback display */}
                    {interview.feedback && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">Feedback:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${interview.feedback.outcome === "pass" ? "bg-green-100 text-green-700" :
                              interview.feedback.outcome === "fail" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-700"
                            }`}>
                            {interview.feedback.outcome?.charAt(0).toUpperCase() + interview.feedback.outcome?.slice(1)}
                          </span>
                          {interview.feedback.rating && (
                            <span className="text-gray-500">({interview.feedback.rating}/5 ⭐)</span>
                          )}
                        </div>
                        {interview.feedback.notes && (
                          <p className="text-sm text-gray-600 mt-1">{interview.feedback.notes}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {interview.status === "scheduled" && (
                      <button
                        onClick={() => handleOpenReschedule(interview)}
                        className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Reschedule
                      </button>
                    )}
                    {!interview.feedback && interview.status !== "cancelled" && (
                      <button
                        onClick={() => setShowFeedback(showFeedback === interview.id ? null : interview.id)}
                        className="px-3 py-1.5 text-sm border border-green-300 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {showFeedback === interview.id ? "Cancel" : "Add Feedback"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Feedback Form */}
                {showFeedback === interview.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <InterviewFeedback
                      onSubmit={handleFeedbackSubmit}
                      isSubmitting={isSubmittingFeedback}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Schedule Interview Modal ── */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Schedule Interview</h2>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4">
              {/* Submission selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Submission <span className="text-red-500">*</span>
                </label>
                {submissions.length > 0 ? (
                  <div className="relative">
                    <select
                      value={scheduleForm.submission_id}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, submission_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
                      required
                    >
                      <option value="">-- Select a submission --</option>
                      {submissions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.candidate_name || "Unknown"} → {sub.job_title || sub.job_id}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded-lg">
                    No approved candidates available. Ensure candidates are approved in Client Review first.
                  </p>
                )}
              </div>

              {/* Round Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interview Round <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={scheduleForm.round_name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, round_name: e.target.value })}
                  placeholder="e.g., Technical Round, HR Round"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduled_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                  min={minDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "video", label: "Video Call", icon: <Video className="w-4 h-4" /> },
                    { value: "phone", label: "Phone", icon: <Phone className="w-4 h-4" /> },
                    { value: "in-person", label: "In-Person", icon: <Users className="w-4 h-4" /> },
                    { value: "on-site", label: "On-Site", icon: <Users className="w-4 h-4" /> },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors ${scheduleForm.mode === opt.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={opt.value}
                        checked={scheduleForm.mode === opt.value}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, mode: e.target.value })}
                        className="sr-only"
                      />
                      {opt.icon}
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling || !scheduleForm.submission_id}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScheduling ? "Scheduling..." : "Schedule Interview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ── */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Reschedule Interview</h2>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={minDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}