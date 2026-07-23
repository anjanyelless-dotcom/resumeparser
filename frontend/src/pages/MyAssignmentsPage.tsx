import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useRecruiterContextStore } from "../store/useRecruiterContextStore";
import { api } from "../services/api";
import { 
  Briefcase, Search, Filter, RefreshCw, 
  MapPin, Clock, Users, Building2,
  Calendar, CheckCircle2, ChevronRight,
  Sparkles, Target, Handshake,
  MoreVertical, FileText, Activity
} from "lucide-react";
import toast from "react-hot-toast";
import type { Job } from "../store/useJobStore";

// Type override for the page locally if Job store doesn't have exact fields
type AssignedJob = Job & {
  candidates_sourced: number;
  ai_shortlisted: number;
  submitted_count: number;
  client_approved: number;
  interviews_count: number;
  offers_count: number;
  assignment_priority: string;
  due_date: string;
  company_name: string;
  assigned_by_name: string;
};

export default function MyAssignmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setCurrentRequirement } = useRecruiterContextStore();

  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    has_next_page: false,
    has_prev_page: false
  });

  const [currentPage, setCurrentPage] = useState(1);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/jobs/my-assignments?page=${currentPage}&limit=10`);
      setJobs(response.data.jobs || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [currentPage]);

  const handleStartSourcing = (job: AssignedJob) => {
    setCurrentRequirement({
      id: job.id,
      title: job.title,
      clientName: job.company_name || "Unknown Client",
      priority: job.assignment_priority,
      dueDate: job.due_date
    });
    navigate("/candidate-sourcing");
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesPriority = priorityFilter === "all" || job.assignment_priority?.toLowerCase() === priorityFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || job.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesClient = clientFilter === "all" || (job.company_name || "") === clientFilter;

    return matchesSearch && matchesPriority && matchesStatus && matchesClient;
  });

  // Extract unique clients for filter dropdown
  const uniqueClients = Array.from(new Set(jobs.map(j => j.company_name).filter(Boolean)));

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'closed': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'on hold': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not Set";
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and track progress for your assigned job requirements
          </p>
        </div>
        <button 
          onClick={fetchAssignments}
          className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Job Title, Req ID, or Client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 shrink-0">
          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-700 min-w-[130px]"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-700 min-w-[130px] shrink-0"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on hold">On Hold</option>
            <option value="closed">Closed</option>
          </select>
          
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-700 min-w-[130px] shrink-0"
          >
            <option value="all">All Clients</option>
            {uniqueClients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
        
        <div className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shrink-0">
          Total: {filteredJobs.length} {filteredJobs.length === 1 ? 'Req' : 'Reqs'}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-500">Loading assignments...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredJobs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No assignments found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            {searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' || clientFilter !== 'all' 
              ? "No jobs match your current filters. Try adjusting them." 
              : "You haven't been assigned any job requirements yet."}
          </p>
          {(searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' || clientFilter !== 'all') && (
            <button 
              onClick={() => {
                setSearchTerm("");
                setPriorityFilter("all");
                setStatusFilter("all");
                setClientFilter("all");
              }}
              className="mt-6 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Cards List */}
      <div className="space-y-6">
        {filteredJobs.map(job => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              
              {/* Card Header & Top Stats */}
              <div className="flex flex-col xl:flex-row justify-between gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">REQ-{job.id.substring(0, 4).toUpperCase()}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
                      {job.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityColor(job.assignment_priority)} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        job.assignment_priority?.toLowerCase() === 'high' ? 'bg-red-500' :
                        job.assignment_priority?.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></span>
                      {job.assignment_priority?.toUpperCase() || 'NORMAL'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{job.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium text-slate-700">{job.company_name}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {job.location || 'Remote'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-6 xl:justify-end">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Assigned By</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {(job.assigned_by_name || 'TL')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{job.assigned_by_name || 'Team Lead'}</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Due Date</span>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Calendar className="w-4 h-4 text-red-500" />
                      {formatDate(job.due_date)}
                    </div>
                  </div>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors ml-auto xl:ml-0">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Job Details Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-100 mb-6 bg-slate-50/50 rounded-lg px-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Open Positions</span>
                  <span className="text-sm font-semibold text-slate-900">{job.number_of_openings || 1}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Experience</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {job.min_experience_years || 0} - {job.max_experience_years || 0} Years
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Department</span>
                  <span className="text-sm font-semibold text-slate-900">{job.department || 'Engineering'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Required Skills</span>
                  <div className="flex gap-1 flex-wrap">
                    {job.required_skills?.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                        {s.skill_name}
                      </span>
                    )) || <span className="text-xs text-slate-400">Not specified</span>}
                    {job.required_skills && job.required_skills.length > 2 && (
                      <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        +{job.required_skills.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  My Progress
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  
                  {/* Metric 1 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-blue-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900">{job.candidates_sourced || 0}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Candidates Sourced</span>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-purple-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900">{job.ai_shortlisted || 0}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">AI Shortlisted</span>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-amber-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                        <FileText className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900">{job.submitted_count || 0}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Submitted to Client</span>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-emerald-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900">{job.client_approved || 0}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Client Approved</span>
                  </div>

                  {/* Metric 5 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-indigo-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900">{job.interviews_count || 0}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Interviews</span>
                  </div>

                  {/* Metric 6 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-rose-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                        <Handshake className="w-4 h-4 text-rose-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900">{job.offers_count || 0}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Offers</span>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Requirement
                </button>
                <button 
                  onClick={() => handleStartSourcing(job)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2"
                >
                  Start Sourcing
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-8 bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600">
            Showing Page <span className="text-slate-900">{pagination.current_page}</span> of <span className="text-slate-900">{pagination.total_pages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!pagination.has_prev_page || isLoading}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(pagination.total_pages, prev + 1))}
              disabled={!pagination.has_next_page || isLoading}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}