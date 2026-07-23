import { useState, useEffect } from "react";
import { Search, RefreshCw, Briefcase, FileText, Users } from "lucide-react";
import { apiClient } from "../../services/api/client";
import toast from "react-hot-toast";

interface Requirement {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  client_name?: string;
  experience_years?: number;
  min_experience_years?: number;
  max_experience_years?: number;
  required_skills?: any;
  assigned_recruiter_count: number;
  my_team_recruiter_count: number;
  closing_date?: string;
  priority?: string;
  positions?: number;
}

export default function AssignedJobsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1 });

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/team-lead/requirements', {
        params: { search, page: pagination.current_page, status: statusFilter || undefined }
      });
      setRequirements(response.data.requirements);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error("Failed to load assigned jobs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, pagination.current_page, statusFilter]);

  const getStatusBadge = (status: string) => {
    const s = (status || 'Open').toLowerCase();
    if (s === 'active') return "bg-green-100 text-green-800";
    if (s === 'closed') return "bg-gray-100 text-gray-800";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Assigned Jobs</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Assigned Jobs..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => fetchJobs()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="text-sm font-medium text-gray-700">Filters:</div>
        <select 
          className="text-sm border-gray-300 rounded-md"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses (Except Archived)</option>
          <option value="active">Active/Open</option>
          <option value="inactive">Inactive/Archived</option>
        </select>
        <select className="text-sm border-gray-300 rounded-md">
          <option>Client</option>
        </select>
        <select className="text-sm border-gray-300 rounded-md">
          <option>Priority</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select className="text-sm border-gray-300 rounded-md">
          <option>Department</option>
        </select>
      </div>

      {isLoading && requirements.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading assigned jobs...</p>
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned jobs found</h3>
          <p className="text-gray-500">There are currently no requirements assigned to your team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {requirements.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-indigo-300 transition-all flex flex-col">
              <div className="p-5 border-b border-gray-100 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{req.title}</h3>
                    <p className="text-sm font-medium text-indigo-600 mt-1">{req.client_name || 'Internal'}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadge(req.status)}`}>
                    {(req.status || 'Open').charAt(0).toUpperCase() + (req.status || 'Open').slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mt-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requirement ID:</span>
                    <span className="font-medium text-gray-900">{req.id.split('-')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Department:</span>
                    <span className="font-medium text-gray-900">{req.department || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Location:</span>
                    <span className="font-medium text-gray-900">{req.location || 'Remote'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Experience:</span>
                    <span className="font-medium text-gray-900">
                      {req.experience_years ? `${req.experience_years} Years` : (req.min_experience_years ? `${req.min_experience_years}-${req.max_experience_years} Years` : 'Any')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Positions:</span>
                    <span className="font-medium text-gray-900">{req.positions || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Priority:</span>
                    <span className="font-medium text-gray-900">{req.priority || 'Medium'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Due Date:</span>
                    <span className="font-medium text-gray-900">
                      {req.closing_date ? new Date(req.closing_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Users className="w-5 h-5 mr-2 text-indigo-500" />
                    <span className="font-medium text-gray-900">{req.assigned_recruiter_count}</span>
                    <span className="text-sm ml-1">Assigned Recruiters</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <a
                  href={`/jobs/${req.id}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View Details
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPagination(p => ({ ...p, current_page: Math.max(1, p.current_page - 1) }))}
            disabled={pagination.current_page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.current_page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, current_page: Math.min(p.total_pages, p.current_page + 1) }))}
            disabled={pagination.current_page === pagination.total_pages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
