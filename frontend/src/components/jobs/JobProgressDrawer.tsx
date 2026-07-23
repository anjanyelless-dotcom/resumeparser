import { X, CheckCircle, Circle, Clock } from "lucide-react";

interface JobProgressDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function JobProgressDrawer({
  isOpen,
  onClose,
  job,
}: JobProgressDrawerProps) {
  if (!isOpen || !job) return null;

  const stages = [
    { label: "Requirement Approved", key: "Waiting Team Lead Assignment" },
    { label: "Team Lead Assigned", key: "Recruiter Assignment" },
    { label: "Recruiters Assigned", key: "Candidate Sourcing" },
    { label: "Candidate Sourcing", key: "Resume Parsing" },
    { label: "Resume Parsing", key: "JD Matching" },
    { label: "JD Matching", key: "AI Matching" },
    { label: "AI Matching", key: "Shortlisted" },
    { label: "Shortlisted", key: "Submission" },
    { label: "Submitted", key: "Client Review" },
    { label: "Interview", key: "Interview" },
    { label: "Offer", key: "Offer" },
    { label: "Joined", key: "Joining" },
    { label: "Placed", key: "Placement" },
  ];

  // Helper to determine stage status
  const getStageStatus = (stageIndex: number) => {
    // Basic logic using recruitment_progress_percentage
    const progress = job.recruitment_progress_percentage || 0;
    const stageProgress = (stageIndex / (stages.length - 1)) * 100;
    
    if (progress > stageProgress) return "completed";
    if (progress === stageProgress) return "current";
    return "pending";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <section className="absolute inset-y-0 right-0 flex max-w-full pl-10">
          <div className="w-screen max-w-md transform transition-all">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
              <div className="bg-indigo-700 px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold leading-6 text-white">
                    Recruitment Progress
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-md text-indigo-200 hover:text-white focus:outline-none"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-indigo-200">
                    {job.title}
                  </p>
                </div>
              </div>
              <div className="relative flex-1 px-4 py-6 sm:px-6">
                {/* Workflow Timeline */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                    Workflow Timeline
                  </h3>
                  <ul className="space-y-4">
                    {stages.map((stage, index) => {
                      const status = getStageStatus(index);
                      return (
                        <li key={index} className="flex items-center">
                          {status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                          ) : status === "current" ? (
                            <Clock className="h-5 w-5 text-indigo-500 mr-3" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300 mr-3" />
                          )}
                          <span className={`text-sm ${status === 'completed' ? 'text-gray-900 font-medium' : status === 'current' ? 'text-indigo-700 font-semibold' : 'text-gray-500'}`}>
                            {stage.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Recruitment Statistics */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                    Recruitment Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Candidates</span>
                      <span className="font-semibold text-gray-900">{job.total_candidates || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Parsed</span>
                      <span className="font-semibold text-gray-900">{job.parsed || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">JD Matched</span>
                      <span className="font-semibold text-gray-900">{job.jd_matched || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">AI Matched</span>
                      <span className="font-semibold text-gray-900">{job.ai_matched || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Shortlisted</span>
                      <span className="font-semibold text-gray-900">{job.shortlisted || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Submitted</span>
                      <span className="font-semibold text-gray-900">{job.submitted || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Interview</span>
                      <span className="font-semibold text-gray-900">{job.interviews || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Offer</span>
                      <span className="font-semibold text-gray-900">{job.offers || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Joined</span>
                      <span className="font-semibold text-gray-900">{job.joined || 0}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-500">Placed</span>
                      <span className="font-semibold text-gray-900">{job.placements || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Assignment Info */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                    Assignment Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Team Lead</span>
                      <span className="text-sm font-medium text-gray-900">{job.team_lead_name || "Unassigned"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Recruiters</span>
                      <span className="text-sm font-medium text-gray-900">{job.recruiters_assigned_count || 0} Assigned</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
