import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamRequirementStore } from "../store/useTeamRequirementStore";
import AssignRecruitersModal from "../components/team/AssignRecruitersModal";
import toast from "react-hot-toast";
import { Briefcase, Search, RefreshCw, Users, ArrowRight } from "lucide-react";

export default function TeamRequirementAssignmentPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const { requirements, pagination, isLoading, fetchTeamRequirements } = useTeamRequirementStore();
  const navigate = useNavigate();

  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const itemsPerPage = 20;

  // Debounce search
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
      setCurrentPage(1);
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputSearchTerm]);

  // Fetch requirements when filters or pagination change
  useEffect(() => {
    loadRequirements();
  }, [currentPage, searchTerm]);

  const loadRequirements = async () => {
    await fetchTeamRequirements({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
    });
  };

  const handleAssignRecruiters = (job: any) => {
    setSelectedJob(job);
    setShowAssignModal(true);
  };

  const handleAssignmentSuccess = () => {
    toast.success(`Recruiters assigned to "${selectedJob.title}"`);
    loadRequirements();
  };

  const handleViewJob = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Requirements</h1>
            <p className="text-gray-600 mt-1">
              {pagination?.total_items || 0} requirements assigned to your team or available for assignment
            </p>
          </div>
          <button
            onClick={loadRequirements}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search requirements..."
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {requirements.length} of {pagination?.total_items || 0} requirements
            {pagination && ` (Page ${pagination.current_page} of ${pagination.total_pages})`}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && requirements.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading requirements...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && requirements.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requirements found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search filters" : "No requirements are available for your team"}
            </p>
          </div>
        )}

        {/* Requirements Grid */}
        {!isLoading && requirements.length > 0 && (
          <div className="space-y-4">
            {requirements.map((requirement) => (
              <div
                key={requirement.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{requirement.title}</h3>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        requirement.status === 'active' ? 'bg-green-100 text-green-700' :
                        requirement.status === 'open' ? 'bg-blue-100 text-blue-700' :
                        requirement.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {requirement.status || 'Unknown'}
                      </span>
                      {requirement.is_my_team && (
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">
                          My Team
                        </span>
                      )}
                      {requirement.is_unassigned && (
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700">
                          Unassigned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                      {requirement.department && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {requirement.department}
                        </span>
                      )}
                      {requirement.location && (
                        <span className="flex items-center gap-1">
                          <span>📍</span>
                          {requirement.location}
                        </span>
                      )}
                      {requirement.company_name && (
                        <span className="flex items-center gap-1">
                          <span>🏢</span>
                          {requirement.company_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {requirement.assigned_recruiter_count} recruiter{requirement.assigned_recruiter_count !== 1 ? 's' : ''} assigned
                      </span>
                      {requirement.my_team_recruiter_count > 0 && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <Users className="w-3 h-3" />
                          {requirement.my_team_recruiter_count} from your team
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-2">
                      {requirement.description?.substring(0, 200)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAssignRecruiters(requirement)}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      Assign Recruiters
                    </button>
                    <button
                      onClick={() => handleViewJob(requirement.id)}
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
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={!pagination.has_prev_page}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={!pagination.has_next_page}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Assign Recruiters Modal */}
      {selectedJob && (
        <AssignRecruitersModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedJob(null);
          }}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          onAssign={handleAssignmentSuccess}
        />
      )}
    </div>
  );
}