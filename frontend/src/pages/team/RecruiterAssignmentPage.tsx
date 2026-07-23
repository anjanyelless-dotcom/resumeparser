import { useState, useEffect } from "react";
import { Users, Search, RefreshCw, Target, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../services/api/client";
import toast from "react-hot-toast";
import AssignRecruitersModal from "../../components/team/AssignRecruitersModal";

interface Requirement {
  id: string;
  title: string;
  client_name?: string;
  status: string;
  assigned_recruiters?: Array<{ id: string; name: string; jobs_count: number }>;
  assigned_recruiter_count: number;
  priority?: string;
  target?: number;
}

export default function RecruiterAssignmentPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1 });

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/team-lead/requirements', {
        params: { search, page: pagination.current_page }
      });
      const reqs = response.data.requirements.map((r: any) => ({
        ...r,
        target: r.number_of_openings || 0, // Fallback to 0 if not set
      }));
      setRequirements(reqs);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error("Failed to load requirements for assignment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, pagination.current_page]);

  const openAssignModal = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsAssignModalOpen(true);
  };

  const getSelectedRequirement = () => requirements.find(r => r.id === selectedJobId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recruiter Assignment</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Job..."
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

      {isLoading && requirements.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading requirements...</p>
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requirements found</h3>
          <p className="text-gray-500">No jobs are currently available for assignment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {requirements.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-indigo-300 transition-all">
              
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">{req.title}</h3>
                <p className="text-sm font-medium text-indigo-600 mt-1">{req.client_name || 'Internal Client'}</p>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Assigned Recruiters</h4>
                {req.assigned_recruiters && req.assigned_recruiters.length > 0 ? (
                  <ul className="space-y-3 mb-6">
                    {req.assigned_recruiters.map((rec) => (
                      <li key={rec.id} className="flex items-center text-sm font-medium text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                        {rec.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 mb-6 italic">No recruiters assigned yet.</p>
                )}

                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Recruiter Workload</h4>
                {req.assigned_recruiters && req.assigned_recruiters.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {req.assigned_recruiters.map((rec) => (
                      <div key={rec.id} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700">{rec.name}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-semibold">{rec.jobs_count} Jobs</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-6 italic">Assign recruiters to see workload.</p>
                )}

                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-indigo-500" />
                  Candidate Target
                </h4>
                <div className="text-2xl font-black text-gray-900 mb-8">{req.target || 20}</div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => openAssignModal(req.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
                  >
                    Assign Recruiters
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors">
                    Reassign
                  </button>
                  <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJobId && (
        <AssignRecruitersModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedJobId(null);
          }}
          jobId={selectedJobId}
          jobTitle={requirements.find(r => r.id === selectedJobId)?.title || 'Job'}
          assignedRecruiters={requirements.find(r => r.id === selectedJobId)?.assigned_recruiters || []}
          onAssign={fetchJobs}
        />
      )}
    </div>
  );
}
