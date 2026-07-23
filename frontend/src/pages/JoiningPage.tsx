import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  UserCheck, RefreshCw, Search, Eye, CheckCircle,
  XCircle, Calendar, Briefcase, Building2, ArrowLeft,
  Clock, AlertCircle, X
} from "lucide-react";

interface JoiningRecord {
  id: string;
  candidate_id: string;
  candidate_name: string;
  job_id: string;
  job_title: string;
  job_company: string;
  status: string;
  offer_status: string;
  joining_status: string;
  joining_date?: string;
  created_at: string;
}

export default function JoiningPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<JoiningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Update modal
  const [updateModal, setUpdateModal] = useState<{
    open: boolean;
    submissionId: string;
    candidateName: string;
    currentStatus: string;
  } | null>(null);
  const [newStatus, setNewStatus] = useState("joined");
  const [joiningDate, setJoiningDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const itemsPerPage = 20;

  useEffect(() => {
    loadRecords();
  }, [currentPage, statusFilter, searchTerm]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        joiningStatus: statusFilter || ""
      });
      if (searchTerm) queryParams.append("search", searchTerm);

      const response = await api.get(`/joining?${queryParams}`);
      const data = response.data;
      const list = data.joining || data.data || [];
      
      setRecords(list);
      setTotalItems(data.pagination?.total_items || list.length);
    } catch (error) {
      console.error("Failed to load joining records:", error);
      toast.error("Failed to load joining data");
    } finally {
      setIsLoading(false);
    }
  };

  const openUpdateModal = (rec: JoiningRecord) => {
    setNewStatus(rec.joining_status === 'pending' ? 'joined' : rec.joining_status);
    setJoiningDate(rec.joining_date ? rec.joining_date.split("T")[0] : "");
    setNotes("");
    setUpdateModal({
      open: true,
      submissionId: rec.id,
      candidateName: rec.candidate_name || "Candidate",
      currentStatus: rec.joining_status,
    });
  };

  const handleUpdate = async () => {
    if (!updateModal) return;
    setIsUpdating(true);
    try {
      const payload: any = { status: newStatus };
      if (joiningDate) payload.joining_date = joiningDate;
      if (notes) payload.notes = notes;

      await api.patch(`/joining/${updateModal.submissionId}/status`, payload);
      toast.success("Joining status updated successfully");
      setUpdateModal(null);
      loadRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update joining status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      offer_accepted: {
        label: "Offer Accepted",
        color: "bg-blue-100 text-blue-800",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      },
      joined: {
        label: "Joined",
        color: "bg-green-100 text-green-800",
        icon: <UserCheck className="w-3.5 h-3.5" />,
      },
      no_show: {
        label: "No Show",
        color: "bg-red-100 text-red-800",
        icon: <XCircle className="w-3.5 h-3.5" />,
      },
      placed: {
        label: "Placed",
        color: "bg-purple-100 text-purple-800",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      },
    };
    return map[status] || {
      label: status,
      color: "bg-gray-100 text-gray-700",
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

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
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                Joining Tracker
              </h1>
              <p className="text-gray-500 mt-1">Track candidate joining status after offer acceptance</p>
            </div>
            <button
              onClick={loadRecords}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Offer Accepted", count: records.filter(r => r.offer_status === "offer_accepted" && r.joining_status === 'pending').length, color: "text-blue-600" },
            { label: "Joined", count: records.filter(r => r.joining_status === "joined").length, color: "text-green-600" },
            { label: "No Show", count: records.filter(r => r.joining_status === "no_show").length, color: "text-red-600" },
            { label: "Placed", count: records.filter(r => r.joining_status === "placed").length, color: "text-purple-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{stat.label}</span>
              <span className={`text-xl font-bold ${stat.color}`}>{stat.count}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate or job..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Joining Stages</option>
            <option value="pending">Offer Accepted (Pending Joining)</option>
            <option value="joined">Joined</option>
            <option value="no_show">No Show</option>
            <option value="placed">Placed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center">
              <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No joining records found</h3>
              <p className="text-gray-400 text-sm">Records will appear when candidates accept offers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Candidate", "Job / Client", "Joining Date", "Status", "Actions"].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((rec) => {
                    const statusToShow = rec.joining_status === 'pending' ? 'offer_accepted' : rec.joining_status;
                    const sc = getStatusConfig(statusToShow);
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-green-700">
                                {(rec.candidate_name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{rec.candidate_name || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-sm text-gray-900">
                              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                              {rec.job_title || "—"}
                            </span>
                            {rec.job_company && (
                              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {rec.job_company}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {rec.joining_date ? (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {new Date(rec.joining_date).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric"
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Not set
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                            {sc.icon}
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openUpdateModal(rec)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Update
                            </button>
                            <button
                              onClick={() => navigate(`/submissions/${rec.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
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

      {/* Update Modal */}
      {updateModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Update Joining Status</h2>
              <button onClick={() => setUpdateModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5 font-medium">{updateModal.candidateName}</p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="joined">Joined ✅</option>
                  <option value="no_show">No Show ❌</option>
                  <option value="placed">Placed 🎯</option>
                  <option value="offer_accepted">Offer Accepted (Revert)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setUpdateModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
