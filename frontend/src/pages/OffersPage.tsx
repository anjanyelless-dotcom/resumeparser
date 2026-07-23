import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  FileText, RefreshCw, Search, Eye, CheckCircle,
  XCircle, Clock, Briefcase, Building2,
  ArrowLeft, Send
} from "lucide-react";

interface OfferSubmission {
  id: string;
  candidate_id: string;
  candidate_name: string;
  job_title: string;
  job_company: string;
  status: string;
  offer_status: string;
  joining_status: string;
  offer_amount?: number;
  offer_date?: string;
  created_at: string;
  submitted_by_name: string;
}

const OFFER_STATUSES = [
  "offer_extended",
  "offer_accepted",
  "offer_rejected",
  "joined",
];

export default function OffersPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<OfferSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Offer details modal
  const [offerModal, setOfferModal] = useState<{
    open: boolean;
    submissionId: string | null;
    currentStatus: string;
  } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const itemsPerPage = 20;

  useEffect(() => {
    loadOffers();
  }, [currentPage, statusFilter, searchTerm]);

  const loadOffers = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        offerStatus: statusFilter || ""
      });
      if (searchTerm) queryParams.append("search", searchTerm);

      const response = await api.get(`/offers?${queryParams}`);
      const data = response.data;
      
      const offerList = (data.offers || data.data || []);
      
      setSubmissions(offerList);
      if (statusFilter === "") {
        const filtered = offerList.filter((s: OfferSubmission) => s.offer_status && s.offer_status !== 'none' && OFFER_STATUSES.includes(s.offer_status));
        setTotalItems(filtered.length);
        setTotalPages(Math.ceil(filtered.length / 20));
      } else {
        setTotalItems(data.pagination?.total_items || offerList.length);
        setTotalPages(data.pagination?.total_pages || Math.ceil(offerList.length / 20));
      }
    } catch (error) {
      console.error("Failed to fetch offers:", error);
      toast.error("Failed to load offers data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = (sub: OfferSubmission) => {
    setNewStatus(sub.offer_status === 'none' ? 'offer_extended' : (sub.offer_status || 'offer_extended'));
    setOfferModal({
      open: true,
      submissionId: sub.id,
      currentStatus: sub.offer_status || 'none',
    });
  };

  const submitStatusUpdate = async () => {
    if (!offerModal || !offerModal.submissionId || !newStatus) return;
    setIsUpdating(true);
    try {
      await api.patch(`/offers/${offerModal.submissionId}/status`, {
        status: newStatus,
        notes: offerNotes
      });
      toast.success("Offer status updated successfully");
      setOfferModal({ open: false, submissionId: null, currentStatus: "" });
      setOfferNotes("");
      loadOffers();
    } catch (error: any) {
      console.error("Error updating offer status:", error);
      toast.error(error.response?.data?.error || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      offer_extended: {
        label: "Offer Extended",
        color: "bg-blue-100 text-blue-800",
        icon: <Send className="w-3.5 h-3.5" />,
      },
      offer_accepted: {
        label: "Offer Accepted",
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      },
      offer_rejected: {
        label: "Offer Rejected",
        color: "bg-red-100 text-red-800",
        icon: <XCircle className="w-3.5 h-3.5" />,
      },
      joined: {
        label: "Joined",
        color: "bg-purple-100 text-purple-800",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      },
      submitted: {
        label: "Submitted",
        color: "bg-gray-100 text-gray-700",
        icon: <Clock className="w-3.5 h-3.5" />,
      },
    };
    return configs[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: <Clock className="w-3.5 h-3.5" /> };
  };



  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                Offer Management
              </h1>
              <p className="text-gray-500 mt-1">Track and manage candidate offers</p>
            </div>
            <button
              onClick={loadOffers}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Offer Extended", count: submissions.filter(s => s.offer_status === "offer_extended").length, color: "text-blue-600 bg-blue-50" },
            { label: "Offer Accepted", count: submissions.filter(s => s.offer_status === "offer_accepted").length, color: "text-green-600 bg-green-50" },
            { label: "Offer Rejected", count: submissions.filter(s => s.offer_status === "offer_rejected").length, color: "text-red-600 bg-red-50" },
            { label: "Joined", count: submissions.filter(s => s.offer_status === "joined" || s.joining_status === "joined").length, color: "text-purple-600 bg-purple-50" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{stat.label}</span>
              <span className={`text-lg font-bold px-2.5 py-1 rounded-lg ${stat.color}`}>
                {stat.count}
              </span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by candidate or job..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Offer Stages</option>
              <option value="offer_extended">Offer Extended</option>
              <option value="offer_accepted">Offer Accepted</option>
              <option value="offer_rejected">Offer Rejected</option>
              <option value="joined">Joined</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading offers...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No offers found</h3>
              <p className="text-gray-400 text-sm">
                Offers will appear here once submissions reach the offer stage in the hiring process.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Candidate", "Job / Client", "Status", "Date", "Actions"].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((sub) => {
                    const statusToShow = sub.joining_status === 'joined' ? 'joined' : (sub.offer_status !== 'none' ? sub.offer_status : sub.status);
                    const sc = getStatusConfig(statusToShow);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-700">
                                {(sub.candidate_name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sub.candidate_name || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-sm text-gray-900">
                              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                              {sub.job_title || "—"}
                            </span>
                            {sub.job_company && (
                              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {sub.job_company}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                            {sc.icon}
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(sub.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric"
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStatusUpdate(sub)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Update
                            </button>
                            <button
                              onClick={() => navigate(`/recruiter/submissions/${sub.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                >Previous</button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                >Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Update Status Modal */}
        {offerModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Update Offer Status</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="offer_extended">Offer Extended</option>
                  <option value="offer_accepted">Offer Accepted</option>
                  <option value="offer_rejected">Offer Rejected</option>
                  <option value="joined">Joined</option>
                  <option value="placed">Placed</option>
                </select>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this offer update..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setOfferModal({ open: false, submissionId: null, currentStatus: "" })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >Cancel</button>
                <button
                  onClick={submitStatusUpdate}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
