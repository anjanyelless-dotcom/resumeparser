import { useState, useEffect } from "react";
import { fetchCandidate } from "../../services/api/candidates";
import { MapPin, Calendar, Clock, Briefcase } from "lucide-react";
import { calculateTotalExperience } from "../../utils/experienceCalculator";
import toast from "react-hot-toast";

type TabType = "overview" | "skills" | "experience" | "education";

interface CandidateProfileProps {
  candidateId: string;
}

export default function CandidateProfile({ candidateId }: CandidateProfileProps) {
  const [candidate, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (candidateId) {
      loadCandidate(candidateId);
    }
  }, [candidateId]);

  const loadCandidate = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await fetchCandidate(id);
      setCandidate(data);
    } catch (error) {
      toast.error("Failed to load candidate details");
    } finally {
      setIsLoading(false);
    }
  };

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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return <div className="p-6 text-gray-500">Candidate data not found.</div>;
  }

  const tabs = [
    { id: "overview" as TabType, label: "Overview" },
    { id: "skills" as TabType, label: "Skills" },
    { id: "experience" as TabType, label: "Experience" },
    { id: "education" as TabType, label: "Education" },
  ];

  const groupedSkills = groupSkillsByCategory(candidate.skills || []);

  const experienceData = candidate.work_history
    ? calculateTotalExperience(candidate.work_history)
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-indigo-600 text-lg font-bold">
                {candidate.full_name
                  ? candidate.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                  : "NA"}
              </span>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-bold text-gray-900">
                {candidate.full_name || "Unknown Candidate"}
              </h3>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm">
                <span className="text-gray-600">{candidate.email}</span>
                {candidate.phone && (
                  <span className="text-gray-600">{candidate.phone}</span>
                )}
                {candidate.location && (
                  <span className="text-gray-600">{candidate.location}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${getConfidenceColor(candidate.parsing_status?.confidence_score || 0)}`}
            >
              AI Score:{" "}
              {Math.round((candidate.parsing_status?.confidence_score || 0) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-2">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
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
      <div className="p-6 max-h-[500px] overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {(experienceData?.total.formatted_string !== "0 Days" || candidate.total_years_exp || candidate.years_experience) && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🏆</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider">Total Experience</p>
                    <p className="text-lg font-bold text-gray-900">
                      {experienceData?.total.formatted_string !== "0 Days" 
                        ? experienceData?.total.formatted_string 
                        : (candidate.total_years_exp?.formatted_string 
                          || `${candidate.years_experience || candidate.total_experience_years || 0} Years`)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {candidate.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {candidate.summary}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Links</h4>
              <div className="flex flex-wrap gap-4">
                {candidate.linkedin_url && (
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">LinkedIn</a>
                )}
                {candidate.github_url && (
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">GitHub</a>
                )}
                {candidate.portfolio_url && (
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">Portfolio</a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            {candidate.skills && candidate.skills.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedSkills).map(([category, skills]) => {
                  const isExpanded = expandedCategories.has(category);
                  const visibleSkills = isExpanded ? skills : skills.slice(0, 10);
                  const remainingCount = skills.length - 10;

                  return (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                        {category}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {visibleSkills.map((skill: any) => (
                          <span
                            key={skill.id || skill.name}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-medium rounded-full"
                          >
                            {skill.skill_name || skill.name}
                          </span>
                        ))}
                        {!isExpanded && remainingCount > 0 && (
                          <button
                            onClick={() => toggleCategory(category)}
                            className="px-2.5 py-1 bg-gray-100 text-gray-600 font-medium rounded-full text-xs hover:bg-gray-200"
                          >
                            +{remainingCount} more
                          </button>
                        )}
                        {isExpanded && remainingCount > 0 && (
                          <button
                            onClick={() => toggleCategory(category)}
                            className="px-2.5 py-1 bg-gray-100 text-gray-600 font-medium rounded-full text-xs hover:bg-gray-200"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No skills parsed.</p>
            )}
          </div>
        )}

        {/* Experience Tab */}
        {activeTab === "experience" && (
          <div className="space-y-6">
            {candidate.work_history && candidate.work_history.length > 0 ? (
              <div className="relative border-l border-gray-200 ml-3 space-y-6">
                {experienceData?.processed.map((exp: any) => (
                  <div key={exp.id || Math.random()} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-1.5 top-1.5 ring-4 ring-white"></div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{exp.job_title}</h4>
                      <p className="text-sm text-gray-600 font-medium mt-0.5">{exp.company_name}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDateRange(exp.start_date || "", exp.end_date || undefined, exp.is_current || false)}</span>
                        </div>
                        {exp.duration_string && exp.duration_string !== "0 Months" && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{exp.duration_string}</span>
                          </div>
                        )}
                        {exp.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{exp.location}</span>
                          </div>
                        )}
                      </div>
                      
                      {exp.description && (
                        <p className="mt-3 text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-md border border-gray-100">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No work experience parsed.</p>
            )}
          </div>
        )}

        {/* Education Tab */}
        {activeTab === "education" && (
          <div className="space-y-4">
            {candidate.education && candidate.education.length > 0 ? (
              candidate.education.map((edu: any) => (
                <div key={edu.id || Math.random()} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{edu.degree}</h4>
                      <p className="text-sm text-gray-600 mt-1">{edu.institution}</p>
                      {edu.field_of_study && (
                        <p className="text-xs text-gray-500 mt-1">{edu.field_of_study}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {formatDateRange(edu.start_date || "", edu.end_date)}
                      </span>
                      {edu.gpa && (
                        <p className="text-xs text-gray-500 mt-1">GPA: {edu.gpa}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No education information parsed.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
