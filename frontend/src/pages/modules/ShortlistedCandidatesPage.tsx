import { useEffect } from "react";
import { useJobStore } from "../../store/useJobStore";
import { Building } from "lucide-react";

export default function ShortlistedCandidatesPage() {
  const { matchResults, fetchMatchResults, submitToHiringProcess } = useJobStore();

  useEffect(() => {
    fetchMatchResults("all");
  }, [fetchMatchResults]);

  const shortlistedCandidates = matchResults.filter(
    (m) => m.recruiter_decision === "Shortlisted"
  );

  const handleSubmitToHiring = async (jobId: string, candidateIds: string[]) => {
    if (!jobId || candidateIds.length === 0) return;
    try {
      await submitToHiringProcess(jobId, candidateIds);
      // Wait a moment before refreshing to allow DB changes to propagate
      setTimeout(() => {
        fetchMatchResults("all");
      }, 500);
    } catch (e) {
      console.error("Failed to submit to hiring process", e);
    }
  };

  // Group shortlisted candidates by job for easier bulk submission
  const candidatesByJob = shortlistedCandidates.reduce((acc, candidate) => {
    if (!acc[candidate.job_id]) acc[candidate.job_id] = [];
    acc[candidate.job_id].push(candidate);
    return acc;
  }, {} as Record<string, typeof shortlistedCandidates>);

  return (
    <div className="space-y-6">
      {shortlistedCandidates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No shortlisted candidates
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Candidates that you shortlist during AI Matching will appear here.
          </p>
        </div>
      ) : (
        Object.entries(candidatesByJob).map(([jobId, candidates]) => {
          const jobTitle = candidates[0]?.job_title || "Unknown Job";
          return (
            <div key={jobId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{jobTitle}</h3>
                  <p className="text-sm text-gray-500">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => handleSubmitToHiring(jobId, candidates.map((c) => c.candidate_id))}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Submit All To Hiring Process
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {candidates.map((c) => (
                  <div
                    key={c.candidate_id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-indigo-600 font-bold text-lg">
                          {(c.candidate_name || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{c.candidate_name || "Unknown Candidate"}</h4>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Building className="w-3 h-3 mr-1" />
                          <span className="line-clamp-1">Match Score: {c.overall_score}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      {c.candidate_email && (
                        <div className="flex items-center">
                          <span className="truncate">{c.candidate_email}</span>
                        </div>
                      )}
                      {c.candidate_location && (
                        <div className="flex items-center">
                          <span className="truncate">{c.candidate_location}</span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleSubmitToHiring(jobId, [c.candidate_id])}
                      className="w-full py-2 border border-indigo-600 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors"
                    >
                      Submit Individually
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}
