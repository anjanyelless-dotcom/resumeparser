import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  CheckCircle, XCircle, RotateCcw, Eye, Briefcase,
  Search, RefreshCw, ChevronDown, ChevronUp, Building2,
  MapPin, Clock, Users, MessageSquare, X
} from "lucide-react";

interface Requirement {
  id: string;
  title: string;
  description?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  approval_status: string;
  company_name?: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
  required_skills?: Array<{ skill_name: string }>;
  min_experience_years?: number;
  max_experience_years?: number;
  number_of_openings?: number;
  salary_min?: number;
  salary_max?: number;
  created_by_name?: string;
  created_by_user_id?: string;
}

export default function RequirementApprovalPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_approval");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Comment modal state
  const [commentModal, setCommentModal] = useState<{
    open: boolean;
    action: "approve" | "reject" | "return";
    requirementId: string;
    requirementTitle: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const itemsPerPage = 20;

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setCurrentPage(1);
    }, 400);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [inputSearchTerm]);

  useEffect(() => {
    loadRequirements();
  }, [currentPage, searchTerm, statusFilter]);

  const loadRequirements = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter; // The API maps 'status' param to approval_status OR recruitment_status

      const response = await api.get("/jobs", { params });
      const data = response.data;
      setRequirements(data.jobs || []);
      setTotalItems(data.pagination?.total_items || data.jobs?.length || 0);
    } catch (error) {
      console.error("Failed to load requirements:", error);
      toast.error("Failed to load requirements");
    } finally {
      setIsLoading(false);
    }
  };

  const openCommentModal = (
    action: "approve" | "reject" | "return",
    req: Requirement
  ) => {
    setComment("");
    setCommentModal({
      open: true,
      action,
      requirementId: req.id,
      requirementTitle: req.title,
    });
  };

  const closeCommentModal = () => {
    setCommentModal(null);
    setComment("");
  };

  const handleAction = async () => {
    if (!commentModal) return;

    const statusMap: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      return: "draft",
    };

    setIsSubmitting(true);
    try {
      await api.patch(`/jobs/${commentModal.requirementId}/status`, {
        status: statusMap[commentModal.action],
        comment: comment || undefined,
      });

      const actionLabels: Record<string, string> = {
        approve: "Approved",
        reject: "Rejected",
        return: "Returned for revision",
      };

      toast.success(`Requirement ${actionLabels[commentModal.action]} successfully`);
      closeCommentModal();
      loadRequirements();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending_approval: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-800",
      draft: "bg-gray-100 text-gray-700",
      rejected: "bg-red-100 text-red-800",
      on_hold: "bg-yellow-100 text-yellow-800",
    };
    return map[status] || "bg-blue-100 text-blue-800";
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-amber-600" />
              </div>
              Requirement Approval
            </h1>
            <p className="text-gray-500 mt-1">
              Review and approve or reject submitted requirements
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/admin/jobs")}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              Go to Recruitment Planning
            </button>
            <button
              onClick={loadRequirements}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Pending Approval", value: requirements.filter(r => r.approval_status === "pending_approval").length, color: "text-amber-600 bg-amber-50" },
            { label: "Total Shown", value: requirements.length, color: "text-blue-600 bg-blue-50" },
            { label: "Approved", value: requirements.filter(r => r.approval_status === "approved").length, color: "text-green-600 bg-green-50" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
              <div className={`text-3xl font-bold ${s.color.split(" ")[0]} px-3 py-2 rounded-lg ${s.color.split(" ")[1]}`}>
                {s.value}
              </div>
              <p className="text-sm text-gray-600 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search requirements..."
                value={inputSearchTerm}
                onChange={(e) => setInputSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            >
              <option value="pending_approval">Pending Approval</option>
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="rejected">Rejected</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>

        {/* Requirements List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
            <span className="ml-3 text-gray-500">Loading requirements...</span>
          </div>
        ) : requirements.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
            <CheckCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No requirements found</h3>
            <p className="text-gray-400 text-sm">
              {statusFilter === "pending_approval"
                ? "No requirements are pending approval at this time."
                : "No requirements match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requirements.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Row Header */}
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 mt-0.5">
                      <Briefcase className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                          {req.title}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(req.approval_status)}`}>
                          {req.approval_status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {req.company_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {req.company_name}
                          </span>
                        )}
                        {req.department && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {req.department}
                          </span>
                        )}
                        {req.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {req.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {req.approval_status === "pending_approval" && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); openCommentModal("approve", req); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openCommentModal("return", req); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Return
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openCommentModal("reject", req); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors border border-red-200"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/jobs/${req.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                    >
                      {expandedId === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === req.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Job Details</p>
                        <div className="space-y-1 text-gray-700">
                          <p><span className="font-medium">Type:</span> {req.employment_type || "—"}</p>
                          <p><span className="font-medium">Openings:</span> {req.number_of_openings || "—"}</p>
                          <p>
                            <span className="font-medium">Experience:</span>{" "}
                            {req.min_experience_years != null ? `${req.min_experience_years}` : "—"}
                            {req.max_experience_years != null ? `–${req.max_experience_years} yrs` : " yrs"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Salary Range</p>
                        <p className="text-gray-700">
                          {req.salary_min != null && req.salary_max != null
                            ? `$${Number(req.salary_min).toLocaleString()} – $${Number(req.salary_max).toLocaleString()}`
                            : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Required Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {req.required_skills && req.required_skills.length > 0
                            ? req.required_skills.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                  {s.skill_name}
                                </span>
                              ))
                            : <span className="text-gray-400">—</span>}
                        </div>
                      </div>
                    </div>
                    {req.description && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Description</p>
                        <p className="text-sm text-gray-600 line-clamp-3">{req.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages} ({totalItems} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comment / Action Modal */}
      {commentModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 capitalize">
                {commentModal.action === "approve" && "✅ Approve Requirement"}
                {commentModal.action === "reject" && "❌ Reject Requirement"}
                {commentModal.action === "return" && "↩️ Return for Revision"}
              </h2>
              <button onClick={closeCommentModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{commentModal.requirementTitle}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Comment {commentModal.action !== "approve" && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={
                  commentModal.action === "approve"
                    ? "Optional: Add approval notes..."
                    : commentModal.action === "reject"
                    ? "Required: Provide reason for rejection..."
                    : "Required: What needs to be revised?"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeCommentModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={
                  isSubmitting ||
                  (commentModal.action !== "approve" && !comment.trim())
                }
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  commentModal.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : commentModal.action === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {isSubmitting ? "Processing..." : `Confirm ${commentModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
