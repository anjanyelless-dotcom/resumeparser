import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useJobStore } from "../store/useJobStore";
import { useUserStore } from "../store/useUserStore";
import toast from "react-hot-toast";
import { Briefcase, Search, RefreshCw, User, ArrowRight, Archive, X } from "lucide-react";
import api from "../services/api";

export default function JobOversightPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState("");
  const [recruiters, setRecruiters] = useState<any[]>([]);

  const { jobs, isLoading, fetchJobs } = useJobStore();
  const { users, fetchUsers } = useUserStore();
  const navigate = useNavigate();

  // Local input state — holds raw typed values before debounce commits them
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [inputDepartment, setInputDepartment] = useState("");
  const [inputLocation, setInputLocation] = useState("");
  const [inputStatus, setInputStatus] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const itemsPerPage = 20;

  // Fetch recruiters for reassignment
  useEffect(() => {
    const loadRecruiters = async () => {
      try {
        await fetchUsers(0, 100); // Fetch all users
        // Filter for recruiters and team leads
        const recruiterUsers = users.filter(
          (user: any) => user.role === 'recruiter' || user.role === 'team_lead'
        );
        setRecruiters(recruiterUsers);
      } catch (error) {
        console.error("Failed to fetch recruiters:", error);
      }
    };
    loadRecruiters();
  }, [users.length]);

  // Debounce: commit local inputs to filter state 400 ms after the user stops typing
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setDepartment(inputDepartment);
      setLocation(inputLocation);
      setStatus(inputStatus);
      setCurrentPage(1);
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputSearchTerm, inputDepartment, inputLocation, inputStatus]);

  // Fetch jobs with adminView when filters or pagination change
  useEffect(() => {
    loadJobs();
  }, [currentPage, searchTerm, department, location, status]);

  const loadJobs = async () => {
    await fetchJobs({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      department: department || undefined,
      location: location || undefined,
      adminView: true, // Enable admin view to see all jobs across all owners
    });
  };

  const handleReassign = (jobId: string, jobTitle: string) => {
    setSelectedJobId(jobId);
    setSelectedJobTitle(jobTitle);
    setSelectedNewOwnerId("");
    setShowReassignModal(true);
  };

  const handleReassignSubmit = async () => {
    if (!selectedNewOwnerId) {
      toast.error("Please select a recruiter");
      return;
    }

    try {
      console.log("Reassigning job:", { selectedJobId, selectedNewOwnerId, selectedJobTitle });
      const response = await api.patch(`/jobs/${selectedJobId}/reassign`, {
        new_owner_id: selectedNewOwnerId
      });
      console.log("Reassign response:", response.data);
      toast.success(`"${selectedJobTitle}" has been reassigned`);
      setShowReassignModal(false);
      fetchJobs(); // Refresh the job list
    } catch (error: any) {
      console.error("Reassign error:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.details?.[0] || error.response?.data?.error || "Failed to reassign job";
      toast.error(errorMessage);
    }
  };

  const handleForceClose = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to force close "${jobTitle}"?`)) return;

    const reason = prompt("Please provide a reason for force closing this job (min 5 characters):");
    if (!reason) return;
    
    // Validate reason length
    if (reason.length < 5) {
      toast.error("Reason must be at least 5 characters long");
      return;
    }
    
    if (reason.length > 500) {
      toast.error("Reason must be less than 500 characters");
      return;
    }

    try {
      console.log("Force closing job:", { jobId, jobTitle, reason });
      const response = await api.patch(`/jobs/${jobId}/force-close`, { reason });
      console.log("Force close response:", response.data);
      toast.success(`"${jobTitle}" has been force closed`);
      fetchJobs(); // Refresh the job list
    } catch (error: any) {
      console.error("Force close error:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.details?.[0] || error.response?.data?.error || "Failed to force close job";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Oversight</h1>
            <p className="text-gray-600 mt-1">
              {jobs.length} total jobs across all users
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
                  placeholder="Search jobs..."
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Department..."
                value={inputDepartment}
                onChange={(e) => setInputDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Location Filter */}
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Location..."
                value={inputLocation}
                onChange={(e) => setInputLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[150px]">
              <select
                value={inputStatus}
                onChange={(e) => setInputStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadJobs}
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
            Showing {jobs.length} jobs
          </p>
        </div>

        {/* Loading State */}
        {isLoading && jobs.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading jobs...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && jobs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">
              {searchTerm || department || location || status
                ? "Try adjusting your search filters"
                : "No jobs have been created yet"}
            </p>
          </div>
        )}

        {/* Jobs Grid */}
        {!isLoading && jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        job.status === 'active' ? 'bg-green-100 text-green-700' :
                        job.status === 'open' ? 'bg-blue-100 text-blue-700' :
                        job.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {job.status || 'Unknown'}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                      {job.department && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <span>📍</span>
                          {job.location}
                        </span>
                      )}
                      {job.company_name && (
                        <span className="flex items-center gap-1">
                          <span>🏢</span>
                          {job.company_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        {job.days_open !== undefined ? `${Math.floor(job.days_open)} days open` : 'Recently created'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-2">
                      {job.description?.substring(0, 200)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReassign(job.id, job.title)}
                      className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
                    >
                      <User className="w-3 h-3" />
                      Reassign
                    </button>
                    {job.status !== 'closed' && (
                      <button
                        onClick={() => handleForceClose(job.id, job.title)}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"
                      >
                        <Archive className="w-3 h-3" />
                        Force Close
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/admin/jobs/${job.id}`)}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {false && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {1}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, 1) }).map((_, idx) => {
                const pageNum = idx + 1;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      pageNum === currentPage
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(1, prev + 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Reassign Job</h3>
              <button
                onClick={() => setShowReassignModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Assign "{selectedJobTitle}" to a new recruiter:
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Recruiter
                </label>
                <select
                  value={selectedNewOwnerId}
                  onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">-- Select a recruiter --</option>
                  {recruiters.map((recruiter) => (
                    <option key={recruiter.id} value={recruiter.id}>
                      {recruiter.email} ({recruiter.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignSubmit}
                disabled={!selectedNewOwnerId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}