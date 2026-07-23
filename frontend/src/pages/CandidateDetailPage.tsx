import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCandidateStore } from "../store/useCandidateStore";
import toast from "react-hot-toast";

type TabType = "overview" | "skills" | "experience" | "education";

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { currentCandidate, fetchCandidate } = useCandidateStore();

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (id) {
      loadCandidate(id);
      // Match results are removed based on requirement
    }
  }, [id]);

  const loadCandidate = async (candidateId: string) => {
    try {
      await fetchCandidate(candidateId);
    } catch (error) {
      toast.error("Failed to load candidate");
      navigate("/candidates");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateRange = (
    startDate: string,
    endDate?: string,
    isCurrent?: boolean,
  ) => {
    const start = formatDate(startDate);
    if (isCurrent) return `${start} - Present`;
    if (endDate) return `${start} - ${formatDate(endDate)}`;
    return `${start} - Present`;
  };

  const groupSkillsByCategory = (skills: any[]) => {
    const grouped: Record<string, any[]> = {};
    skills?.forEach((skill) => {
      const category = skill.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(skill);
    });
    return grouped;
  };

  if (!currentCandidate) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as TabType, label: "Overview" },
    { id: "skills" as TabType, label: "Skills" },
    { id: "experience" as TabType, label: "Experience" },
    { id: "education" as TabType, label: "Education" },
  ];

  const groupedSkills = groupSkillsByCategory(currentCandidate.skills || []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 text-xl font-bold">
                {currentCandidate.full_name
                  ? currentCandidate.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "NA"}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentCandidate.full_name || "Unknown Candidate"}
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-gray-600">{currentCandidate.email}</p>
                {currentCandidate.phone && (
                  <p className="text-gray-600">{currentCandidate.phone}</p>
                )}
                {currentCandidate.location && (
                  <p className="text-gray-600">{currentCandidate.location}</p>
                )}
              </div>
              <div className="flex items-center space-x-3 mt-2">
                {currentCandidate.linkedin_url && (
                  <a
                    href={currentCandidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    LinkedIn Profile
                  </a>
                )}
                {currentCandidate.github_url && (
                  <a
                    href={currentCandidate.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    GitHub Profile
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${getConfidenceColor(currentCandidate.parsing_status?.confidence_score || 0)}`}
            >
              Confidence:{" "}
              {Math.round(
                (currentCandidate.parsing_status?.confidence_score || 0) * 100,
              )}
              %
            </span>
            <p className="text-xs text-gray-500 mt-1">
              Updated {formatDate(currentCandidate.updated_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Summary
                    </h3>
                    <p className="text-gray-600">
                      {currentCandidate.summary || "No summary available"}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Contact Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{currentCandidate.email}</p>
                      </div>
                      {currentCandidate.phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">
                            {currentCandidate.phone}
                          </p>
                        </div>
                      )}
                      {currentCandidate.location && (
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium">
                            {currentCandidate.location}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Added</p>
                        <p className="font-medium">
                          {formatDate(currentCandidate.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === "skills" && (
                <div className="space-y-6">
                  {/* Skills Overview - Chip-based UI */}
                  {currentCandidate.skills && currentCandidate.skills.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Skills Overview
                      </h3>
                      <div className="space-y-6">
                        {Object.entries(groupedSkills).map(([category, skills]) => {
                          const isExpanded = expandedCategories.has(category);
                          const visibleSkills = isExpanded ? skills : skills.slice(0, 6);
                          const remainingCount = skills.length - 6;

                          return (
                            <div key={category}>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                {category}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {visibleSkills.map((skill) => (
                                  <span
                                    key={skill.id}
                                    className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-full shadow-sm hover:bg-purple-100 transition-colors"
                                  >
                                    {skill.skill_name || skill.name}
                                  </span>
                                ))}
                                {!isExpanded && remainingCount > 0 && (
                                  <button
                                    onClick={() => toggleCategory(category)}
                                    className="px-3 py-1 bg-purple-600 text-white font-medium rounded-full text-sm hover:bg-purple-700 transition-colors"
                                  >
                                    +{remainingCount} more
                                  </button>
                                )}
                                {isExpanded && (
                                  <button
                                    onClick={() => toggleCategory(category)}
                                    className="px-3 py-1 bg-purple-600 text-white border border-transparent text-xs font-semibold rounded-full shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Experience Tab */}
              {activeTab === "experience" && (
                <div className="space-y-6">
                  {currentCandidate.work_experience &&
                  currentCandidate.work_experience.length > 0 ? (
                    <div className="relative">
                      {/* Timeline */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                      {currentCandidate.work_experience.map((exp) => (
                        <div
                          key={exp.id}
                          className="relative flex items-start mb-8"
                        >
                          {/* Timeline dot */}
                          <div className="absolute left-2 w-4 h-4 bg-indigo-600 rounded-full border-4 border-white"></div>

                          {/* Content */}
                          <div className="ml-10 flex-1">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-lg font-medium text-gray-900">
                                    {exp.job_title}
                                  </h4>
                                  <p className="text-gray-600">
                                    {exp.company_name}
                                  </p>
                                  {exp.location && (
                                    <p className="text-sm text-gray-500">
                                      {exp.location}
                                    </p>
                                  )}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {formatDateRange(
                                    exp.start_date,
                                    exp.end_date,
                                    exp.is_current,
                                  )}
                                </span>
                              </div>
                              {exp.description && (
                                <p className="mt-3 text-gray-600">
                                  {exp.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      No work experience available
                    </p>
                  )}
                </div>
              )}

              {/* Education Tab */}
              {activeTab === "education" && (
                <div className="space-y-6">
                  {currentCandidate.education &&
                  currentCandidate.education.length > 0 ? (
                    <div className="space-y-4">
                      {currentCandidate.education.map((edu) => (
                        <div
                          key={edu.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                {edu.degree}
                              </h4>
                              <p className="text-gray-600">{edu.institution}</p>
                              {edu.field_of_study && (
                                <p className="text-sm text-gray-500">
                                  {edu.field_of_study}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-sm text-gray-500">
                                {formatDateRange(
                                  edu.start_date || "",
                                  edu.end_date,
                                )}
                              </span>
                              {edu.gpa && (
                                <p className="text-sm text-gray-600">
                                  GPA: {edu.gpa}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      No education information available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
