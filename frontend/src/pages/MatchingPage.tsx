import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useJobStore } from "../store/useJobStore";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function MatchingPage() {
  const location = useLocation();
  const [selectedJob, setSelectedJob] = useState<string>(location.state?.jobId || "");
  const [isMatching, setIsMatching] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const { runMatching, fetchMatchResults, fetchJobs, jobs: storeJobs, matchResults: storeMatchResults } = useJobStore();

  const jobs = storeJobs || [];
  const matchResults = storeMatchResults || [];

  useEffect(() => {
    loadJobs();
    loadMatchResults();
  }, []);

  useEffect(() => {
    if (location.state?.jobId) {
      setSelectedJob(location.state.jobId);
    }
  }, [location.state?.jobId]);

  const loadJobs = async () => {
    try {
      await fetchJobs();
    } catch (error) {
      toast.error("Failed to load jobs");
    }
  };

  const loadMatchResults = async () => {
    try {
      await fetchMatchResults("all");
    } catch (error) {
      console.error("Failed to load match results");
    }
  };

  const handleRunMatching = async () => {
    if (!selectedJob) {
      toast.error("Please select a job first");
      return;
    }

    setIsMatching(true);
    setShowSuccessBanner(false);
    try {
      await runMatching(selectedJob);
      setShowSuccessBanner(true);
      loadMatchResults();
    } catch (error: any) {
      toast.error(error.message || "Matching failed");
    } finally {
      setIsMatching(false);
    }
  };

  const toggleRowExpansion = (resultId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const exportToCSV = () => {
    if (matchResults.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Rank",
      "Candidate Name",
      "Email",
      "Overall Score",
      "Skill Score",
      "Experience Score",
      "Education Score",
      "Recommendation",
      "Matching Skills",
      "Missing Skills",
    ];
    const csvContent = [
      headers.join(","),
      ...matchResults.map((result, index) =>
        [
          index + 1,
          result.candidate_name,
          result.candidate_email,
          result.overall_score,
          result.skill_score,
          result.experience_score,
          result.education_score,
          result.recommendation,
          `"${result.matching_skills.join("; ")}"`,
          `"${result.missing_skills.join("; ")}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matching_results_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Results exported successfully!");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "Strong Match":
        return "bg-green-100 text-green-800";
      case "Good Match":
        return "bg-blue-100 text-blue-800";
      case "Partial Match":
        return "bg-yellow-100 text-yellow-800";
      case "Not Recommended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const filteredResults = selectedJob
    ? matchResults.filter((result) => result.job_id === selectedJob)
    : matchResults;

  const selectedJobObj = jobs.find((j) => j.id === selectedJob);
  const jobStatus = (selectedJobObj?.status || "active").toLowerCase();
  
  const isDraft = jobStatus === "draft";
  const isOnHold = jobStatus === "on hold" || jobStatus === "on_hold";
  const isClosed = jobStatus === "closed";
  const isActive = jobStatus === "active" || (!isDraft && !isOnHold && !isClosed);

  // Chart data
  const scoreDistribution = [
    {
      range: "90-100%",
      count: filteredResults.filter((r) => r.overall_score >= 90).length,
    },
    {
      range: "80-89%",
      count: filteredResults.filter(
        (r) => r.overall_score >= 80 && r.overall_score < 90,
      ).length,
    },
    {
      range: "70-79%",
      count: filteredResults.filter(
        (r) => r.overall_score >= 70 && r.overall_score < 80,
      ).length,
    },
    {
      range: "60-69%",
      count: filteredResults.filter(
        (r) => r.overall_score >= 60 && r.overall_score < 70,
      ).length,
    },
    {
      range: "50-59%",
      count: filteredResults.filter(
        (r) => r.overall_score >= 50 && r.overall_score < 60,
      ).length,
    },
    {
      range: "<50%",
      count: filteredResults.filter((r) => r.overall_score < 50).length,
    },
  ];

  const recommendationData = [
    {
      name: "Strong Match",
      value: filteredResults.filter((r) => r.recommendation === "Strong Match")
        .length,
      color: "#10b981",
    },
    {
      name: "Good Match",
      value: filteredResults.filter((r) => r.recommendation === "Good Match")
        .length,
      color: "#3b82f6",
    },
    {
      name: "Partial Match",
      value: filteredResults.filter((r) => r.recommendation === "Partial Match")
        .length,
      color: "#f59e0b",
    },
    {
      name: "Not Recommended",
      value: filteredResults.filter((r) => r.recommendation === "Not Recommended")
        .length,
      color: "#ef4444",
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Candidate Matching</h1>
        <p className="text-gray-600">
          Match candidates against job requirements
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Job
            </label>
            <select
              value={selectedJob}
              onChange={(e) => {
                setSelectedJob(e.target.value);
                setExpandedRows(new Set());
                setShowSuccessBanner(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.department}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRunMatching}
              disabled={isMatching || !selectedJob || !isActive}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isMatching ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Running Matching...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 mr-2"
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
                  Run Matching
                </>
              )}
            </button>

            <button
              onClick={exportToCSV}
              disabled={filteredResults.length === 0 || !isActive}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {selectedJob && !isActive ? (
          <div className="flex-1 bg-white rounded-lg shadow-sm p-12 flex flex-col items-center justify-center text-center">
            {isDraft && (
              <div className="max-w-md">
                <div className="text-4xl mb-4">📝</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Draft Job</h2>
                <p className="text-gray-600 mb-2">This job is currently saved as Draft.</p>
                <p className="text-gray-600 mb-4">Candidate matching is not available until the job is activated.</p>
                <p className="text-gray-600">Please change the job status to Active to perform matching.</p>
                <div className="mt-8 flex justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700 font-medium">Job Status : Draft</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-500 font-medium">Matching Status : Disabled</span>
                </div>
              </div>
            )}
            {isOnHold && (
              <div className="max-w-md">
                <div className="text-4xl mb-4">⏸️</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Hiring On Hold</h2>
                <p className="text-gray-600 mb-2">This job is currently On Hold.</p>
                <p className="text-gray-600 mb-4">Candidate matching is temporarily unavailable because hiring has been paused.</p>
                <p className="text-gray-600">Resume matching will be available once the job is moved back to Active status.</p>
                <div className="mt-8 flex justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-yellow-100 rounded-full text-yellow-800 font-medium">Job Status : On Hold</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-500 font-medium">Matching Status : Temporarily Disabled</span>
                </div>
              </div>
            )}
            {isClosed && (
              <div className="max-w-md">
                <div className="text-4xl mb-4">🔒</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Closed</h2>
                <p className="text-gray-600 mb-2">This job posting has been closed.</p>
                <p className="text-gray-600 mb-4">Candidate matching is no longer available for closed jobs.</p>
                <p className="text-gray-600">Please reopen or create a new job to perform matching again.</p>
                <div className="mt-8 flex justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-red-100 rounded-full text-red-800 font-medium">Job Status : Closed</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-500 font-medium">Matching Status : Unavailable</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Results Table */}
            <div className="flex-1">
              {showSuccessBanner && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
                  <span className="text-green-500 mr-3 text-xl">✅</span>
                  <div>
                    <h4 className="text-green-800 font-medium">Matching completed successfully.</h4>
                    <p className="text-green-700 text-sm mt-1">Showing the best matching candidates based on Skills, Experience, Education, and Match Score.</p>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {isMatching ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Running matching algorithm...</p>
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Overall Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Skill Match
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recommendation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResults.map((result, index) => (
                      <React.Fragment key={result.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleRowExpansion(result.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              #{index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-indigo-600">
                                  {getInitials(result.candidate_name)}
                                </span>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {result.candidate_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {result.candidate_email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${getScoreColor(result.overall_score)}`}
                                  style={{ width: `${result.overall_score}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {result.overall_score}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {result.skill_score}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {result.experience_score}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getRecommendationColor(result.recommendation)}`}
                            >
                              {result.recommendation}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {expandedRows.has(result.id) && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-4">
                                {/* Score Breakdown */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                                    Score Breakdown
                                  </h4>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                      <p className="text-2xl font-bold text-indigo-600">
                                        {result.skill_score}%
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Skills
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-2xl font-bold text-green-600">
                                        {result.experience_score}%
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Experience
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-2xl font-bold text-purple-600">
                                        {result.education_score}%
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Education
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Skills */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                                      Matching Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {result.matching_skills.map(
                                        (skill, idx) => (
                                          <span
                                            key={idx}
                                            className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"
                                          >
                                            {skill}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                                      Missing Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {result.missing_skills.map(
                                        (skill, idx) => (
                                          <span
                                            key={idx}
                                            className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded"
                                          >
                                            {skill}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Reason */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                                    Analysis
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {result.reason}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No matching results
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedJob
                    ? "Run matching to see results"
                    : "Select a job and run matching"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel - Charts */}
        <div className="w-80">
          <div className="space-y-6">
            {/* Score Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Score 
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recommendation Breakdown */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recommendations
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={recommendationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {recommendationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {recommendationData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Matches</span>
                  <span className="text-sm font-medium text-gray-900">
                    {filteredResults.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Score</span>
                  <span className="text-sm font-medium text-gray-900">
                    {filteredResults.length > 0
                      ? Math.round(
                          filteredResults.reduce(
                            (acc, r) => acc + r.overall_score,
                            0,
                          ) / filteredResults.length,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Strong Matches</span>
                  <span className="text-sm font-medium text-green-600">
                    {
                      filteredResults.filter(
                        (r) => r.recommendation === "Strong Match",
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
