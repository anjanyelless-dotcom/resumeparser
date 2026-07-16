import { useState } from "react";
import { api } from "../services/api";
import toast from "react-hot-toast";
import CandidateFilterSearch from "./CandidateFilterSearch";
import XRaySearchPage from "./XRaySearchPage";
import BooleanSearchPage from "./BooleanSearchPage";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ATSMatch {
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  candidate_location?: string;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  role_score: number;
  project_score: number;
  education_score: number;
  certification_score: number;
  matched_skills: string[];
  missing_skills: string[];
  match_label: "Strong Match" | "Good Match" | "Average Match" | "Low Match";
  match_summary: string;
  experience_years?: number;
  jd_experience_years?: number;
}

interface JDParseResponse {
  success: boolean;
  extracted_skills: string[];
  experience_required: number;
  experience_text?: string;
  role_keywords: string[];
  education_keywords: string[];
  total_candidates: number;
  matches: ATSMatch[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getMatchLabelStyle(label: string) {
  switch (label) {
    case "Strong Match":
      return { badge: "bg-green-100 text-green-800 border border-green-200", dot: "bg-green-500" };
    case "Good Match":
      return { badge: "bg-blue-100 text-blue-800 border border-blue-200", dot: "bg-blue-500" };
    case "Average Match":
      return { badge: "bg-yellow-100 text-yellow-800 border border-yellow-200", dot: "bg-yellow-500" };
    default:
      return { badge: "bg-red-100 text-red-800 border border-red-200", dot: "bg-red-400" };
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-500";
}

function getScoreBarColor(score: number): string {
  if (score >= 90) return "bg-green-500";
  if (score >= 75) return "bg-blue-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-400";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function getAvatarBg(name: string): string {
  const colors = [
    "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-blue-500",
    "bg-teal-500", "bg-green-600", "bg-orange-500", "bg-rose-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Gauge component
// ─────────────────────────────────────────────────────────────────────────────
function ScoreGauge({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="14"
            fill="none" stroke="#e5e7eb" strokeWidth="3"
          />
          <circle
            cx="18" cy="18" r="14"
            fill="none"
            stroke={score >= 75 ? "#4f46e5" : score >= 50 ? "#f59e0b" : "#ef4444"}
            strokeWidth="3"
            strokeDasharray={`${(score / 100) * 87.96} 87.96`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
          {score}%
        </span>
      </div>
      <span className="text-[10px] text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate Match Card
// ─────────────────────────────────────────────────────────────────────────────
function CandidateCard({ match, rank }: { match: ATSMatch; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const labelStyle = getMatchLabelStyle(match.match_label);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Rank badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mt-1">
            <span className="text-xs font-bold text-indigo-600">#{rank}</span>
          </div>

          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getAvatarBg(match.candidate_name)}`}
          >
            {getInitials(match.candidate_name)}
          </div>

          {/* Name / Email */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {match.candidate_name}
                </h3>
                <p className="text-sm text-gray-500 truncate">{match.candidate_email}</p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${labelStyle.badge}`}
              >
                <span className={`w-2 h-2 rounded-full ${labelStyle.dot}`} />
                {match.match_label}
              </span>
            </div>

            {/* Location + Experience */}
            <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              {match.candidate_location && (
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {match.candidate_location}
                </span>
              )}
              {(match.experience_years !== undefined || match.jd_experience_years !== undefined) && (
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {match.experience_years ?? 0}
                  {match.jd_experience_years ? ` / ${match.jd_experience_years}` : ""} yrs
                </span>
              )}
            </div>
          </div>

          {/* ATS Score */}
          <div className="flex-shrink-0 text-right">
            <p className={`text-3xl font-extrabold ${getScoreColor(match.overall_score)}`}>
              {match.overall_score}%
            </p>
            <p className="text-xs text-gray-400">ATS Score</p>
          </div>
        </div>

        {/* Overall score bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Overall ATS Score</span>
            <span className="font-medium">{match.overall_score}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getScoreBarColor(match.overall_score)}`}
              style={{ width: `${match.overall_score}%` }}
            />
          </div>
        </div>

        {/* Matched skills preview */}
        {match.matched_skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {showAllSkills
              ? match.matched_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200"
                  >
                    ✓ {skill}
                  </span>
                ))
              : match.matched_skills.slice(0, 6).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200"
                  >
                    ✓ {skill}
                  </span>
                ))}
            {match.matched_skills.length > 6 && (
              <button
                onClick={() => setShowAllSkills(!showAllSkills)}
                className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
              >
                {showAllSkills ? "Show less" : `+${match.matched_skills.length - 6} more`}
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        <p className="mt-3 text-xs text-gray-600 leading-relaxed">{match.match_summary}</p>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
        >
          {expanded ? "Hide details" : "View score breakdown"}
          <svg
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">
          {/* Score gauges */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Score Breakdown
            </h4>
            <div className="flex justify-around flex-wrap gap-3">
              <ScoreGauge score={match.skill_score} label="Skills" />
              <ScoreGauge score={match.experience_score} label="Experience" />
              <ScoreGauge score={match.role_score} label="Role" />
              <ScoreGauge score={match.project_score} label="Projects" />
              <ScoreGauge score={match.education_score} label="Education" />
              <ScoreGauge score={match.certification_score} label="Certs" />
            </div>
          </div>

          {/* Skills grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Matched Skills ({match.matched_skills.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {match.matched_skills.length > 0 ? (
                  match.matched_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No matching skills found</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Missing Skills ({match.missing_skills.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {match.missing_skills.length > 0 ? (
                  match.missing_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">None — all skills matched!</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function JDMatchingPage() {
  const [activeTab, setActiveTab] = useState<"jd-matching" | "filter-search" | "xray-search" | "boolean-search">("jd-matching");
  const [jdText, setJdText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<JDParseResponse | null>(null);
  const [showAllExtractedSkills, setShowAllExtractedSkills] = useState(false);
  const [filterLabel, setFilterLabel] = useState<string>("All");

  const handleParseJD = async () => {
    if (!jdText.trim() || jdText.trim().length < 20) {
      toast.error("Please paste a Job Description (minimum 20 characters).");
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const response = await api.post<JDParseResponse>("/matching/jd/parse", {
        jd_text: jdText,
      });

      if (response.data.success) {
        setResults(response.data);
        if (response.data.matches.length === 0) {
          toast("No candidates found in the database.", { icon: "ℹ️" });
        } else {
          toast.success(
            `Ranked ${response.data.matches.length} candidates across ${response.data.extracted_skills.length} extracted skills.`
          );
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to parse Job Description.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setJdText("");
    setResults(null);
    setFilterLabel("All");
  };

  const filteredMatches = results
    ? filterLabel === "All"
      ? results.matches
      : results.matches.filter((m) => m.match_label === filterLabel)
    : [];

  const labelCounts = results
    ? {
      "Strong Match": results.matches.filter((m) => m.match_label === "Strong Match").length,
      "Good Match": results.matches.filter((m) => m.match_label === "Good Match").length,
      "Average Match": results.matches.filter((m) => m.match_label === "Average Match").length,
      "Low Match": results.matches.filter((m) => m.match_label === "Low Match").length,
    }
    : null;

  return (
    <div className="p-6 min-h-full bg-gray-50">
      {/* ── Page Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Candidate Matching Workspace</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Use multiple search methods to find the best candidates for your roles.
        </p>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("jd-matching")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "jd-matching"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              JD Matching
            </button>
            <button
              onClick={() => setActiveTab("filter-search")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "filter-search"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Filter Search
            </button>
            <button
              onClick={() => setActiveTab("xray-search")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "xray-search"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              X-Ray Search
            </button>
            <button
              onClick={() => setActiveTab("boolean-search")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "boolean-search"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Boolean Search
            </button>
          </nav>
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "jd-matching" && (
        <>

      {/* ── JD Input Card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <label
          htmlFor="jd-textarea"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Job Description
        </label>
        <textarea
          id="jd-textarea"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder={`Paste the complete Job Description here...\n\nExample:\nWe are looking for a Senior Java Developer with 5+ years of experience in Spring Boot, REST APIs, PostgreSQL, and Docker. Experience with AWS and Kubernetes is a plus. A Bachelor's degree in Computer Science is required.`}
          className="w-full h-64 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono leading-relaxed transition-all"
          disabled={isLoading}
        />
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-400">
            {jdText.length > 0 ? `${jdText.length} characters` : "Minimum 20 characters required"}
          </p>
          <div className="flex gap-3">
            {(jdText || results) && (
              <button
                onClick={handleClear}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <button
              id="parse-jd-button"
              onClick={handleParseJD}
              disabled={isLoading || jdText.trim().length < 20}
              className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Parsing JD...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Parse JD
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading indicator ── */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Extracting JD skills and ranking candidates...</p>
          <p className="text-gray-400 text-sm mt-1">This runs locally — no external AI needed.</p>
        </div>
      )}

      {/* ── Results ── */}
      {!isLoading && results && (
        <>
          {/* Extraction summary banner */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-indigo-800">
                <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span><strong>{results.extracted_skills.length}</strong> skills extracted</span>
              </div>
              {(results.experience_required > 0 || results.experience_text) && (
                <div className="flex items-center gap-2 text-sm text-indigo-800">
                  <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>{results.experience_text || `${results.experience_required}+ years`}</strong> required</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-indigo-800">
                <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span><strong>{results.total_candidates}</strong> candidates scored</span>
              </div>
            </div>
            {/* Extracted skill chips */}
            {results.extracted_skills.length > 0 && (
              <div className="flex flex-wrap gap-1 max-w-lg">
                {showAllExtractedSkills
                  ? results.extracted_skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 text-xs rounded-full">
                        {s}
                      </span>
                    ))
                  : results.extracted_skills.slice(0, 12).map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 text-xs rounded-full">
                        {s}
                      </span>
                    ))}
                {results.extracted_skills.length > 12 && (
                  <button
                    onClick={() => setShowAllExtractedSkills(!showAllExtractedSkills)}
                    className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-500 text-xs rounded-full hover:bg-indigo-50 cursor-pointer"
                  >
                    {showAllExtractedSkills ? "Show less" : `+${results.extracted_skills.length - 12} more`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Filter tabs */}
          {results.matches.length > 0 && labelCounts && (
            <div className="flex gap-2 mb-5 flex-wrap">
              {(["All", "Strong Match", "Good Match", "Average Match", "Low Match"] as const).map((lbl) => {
                const count = lbl === "All" ? results.matches.length : labelCounts[lbl as keyof typeof labelCounts];
                const active = filterLabel === lbl;
                return (
                  <button
                    key={lbl}
                    onClick={() => setFilterLabel(lbl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    {lbl} {count > 0 && <span className={`ml-1 ${active ? "opacity-80" : "text-gray-400"}`}>({count})</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Candidate cards */}
          {filteredMatches.length > 0 ? (
            <div className="space-y-4">
              {filteredMatches.map((match) => (
                <CandidateCard
                  key={match.candidate_id}
                  match={match}
                  rank={results.matches.indexOf(match) + 1}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-sm">No candidates match the selected filter.</p>
            </div>
          )}
        </>
      )}

      {/* ── Empty state (before first search) ── */}
          {!isLoading && !results && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-indigo-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-base font-medium text-gray-700 mb-1">Ready to match candidates</h3>
              <p className="text-sm text-gray-400">
                Paste a Job Description above and click <strong>Parse JD</strong> to see ranked results.
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === "filter-search" && (
        <CandidateFilterSearch />
      )}

      {activeTab === "xray-search" && (
        <XRaySearchPage />
      )}

      {activeTab === "boolean-search" && (
        <BooleanSearchPage />
      )}
    </div>
  );
}
