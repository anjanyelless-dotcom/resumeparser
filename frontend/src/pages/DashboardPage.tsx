import { useEffect, useState } from "react";
import { useCandidateStore } from "../store/useCandidateStore";
import { useJobStore } from "../store/useJobStore";

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function DashboardPage() {
  const { candidates, fetchCandidates } = useCandidateStore();
  const { jobs, fetchJobs, matchResults, fetchMatchResults } = useJobStore();
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    // Load initial data
    fetchCandidates();
    fetchJobs();
    fetchMatchResults("all");
  }, [fetchCandidates, fetchJobs, fetchMatchResults]);

  useEffect(() => {
    // Calculate stats when data changes
    const totalCandidates = (candidates || []).length;
    const activeJobs = (jobs || []).length;
    const matchesToday = (matchResults || []).length;
    const avgScore =
      (matchResults || []).length > 0
        ? Math.round(
            (matchResults || []).reduce((acc, match) => acc + match.overall_score, 0) /
              (matchResults || []).length,
          )
        : 0;

    setStats([
      {
        title: "Total Candidates",
        value: totalCandidates,
        icon: (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ),
      },
      {
        title: "Active Jobs",
        value: activeJobs,
        icon: (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        title: "Matches Today",
        value: matchesToday,
        icon: (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        title: "Avg Match Score",
        value: `${avgScore}%`,
        icon: (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        ),
      },
    ]);
  }, [candidates, jobs, matchResults]);

  const recentUploads = (candidates || []).slice(0, 5);
  const topMatches = (matchResults || []).slice(0, 5);

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here's what's happening with your resume parsing today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-indigo-100 rounded-lg">
                <div className="text-indigo-600">{stat.icon}</div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Uploads
            </h3>
          </div>
          <div className="overflow-hidden">
            {recentUploads.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentUploads.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">
                              {candidate.full_name?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {candidate.full_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {candidate.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`
                          px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${
                            candidate.parsing_status?.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : candidate.parsing_status?.status ===
                                  "processing"
                                ? "bg-yellow-100 text-yellow-800"
                                : candidate.parsing_status?.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }
                        `}
                        >
                          {candidate.parsing_status?.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {candidate.parsing_status?.confidence_score
                          ? `${Math.round(candidate.parsing_status.confidence_score * 100)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="mt-2">No recent uploads</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Matching Candidates */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Top Matching Candidates
            </h3>
          </div>
          <div className="overflow-hidden">
            {topMatches.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {topMatches.map((match, index) => (
                  <div key={match.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-indigo-600">
                            {index + 1}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {match.candidate_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {match.candidate_email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <span className="text-lg font-semibold text-gray-900">
                            {match.overall_score}%
                          </span>
                          <span
                            className={`
                            ml-2 px-2 py-1 text-xs font-medium rounded-full
                            ${
                              match.recommendation === "Strong Match"
                                ? "bg-green-100 text-green-800"
                                : match.recommendation === "Good Match"
                                  ? "bg-blue-100 text-blue-800"
                                  : match.recommendation === "Partial Match"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                            }
                          `}
                          >
                            {match.recommendation}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="mt-2">No matching results yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
