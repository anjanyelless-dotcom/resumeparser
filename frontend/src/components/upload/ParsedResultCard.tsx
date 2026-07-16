import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  ChevronRight,
  Cloud,
  Code,
  Layers,
  Database,
  Wrench,
  BookOpen,
  Users,
  GraduationCap,
  User,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Award
} from "lucide-react";

interface ParsedResultCardProps {
  result: any;
  candidateId?: string;
  onUploadAnother: () => void;
}

export default function ParsedResultCard({ 
  result, 
  candidateId,
  onUploadAnother 
}: ParsedResultCardProps) {
  const navigate = useNavigate();

  const confidenceScore = Math.round((result.confidence?.overall || 0) * 100);
  
  const getQualityLabel = (score: number) => {
    if (score >= 85) return "Excellent Quality";
    if (score >= 70) return "Good Quality";
    if (score >= 50) return "Fair Quality";
    return "Needs Review";
  };

  const getQualityColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-500";
  };

  const categorizeSkills = (skills: string[]) => {
    const categories = {
      "Cloud & DevOps": [] as string[],
      "Programming Languages": [] as string[],
      "Frameworks & Libraries": [] as string[],
      "Databases": [] as string[],
      "Tools & Platforms": [] as string[],
      "Methodologies": [] as string[],
      "Soft Skills": [] as string[]
    };

    const cloudKeywords = ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd", "devops", "cloud"];
    const langKeywords = ["java", "python", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "perl", "r"];
    const frameworkKeywords = ["react", "angular", "vue", "spring", "django", "flask", "express", "node", "nest", "nextjs", "laravel", "rails", "fastapi"];
    const dbKeywords = ["sql", "mysql", "postgresql", "mongodb", "redis", "oracle", "dynamodb", "cassandra", "database", "sqlite", "mariadb"];
    const toolKeywords = ["git", "jira", "confluence", "postman", "vs code", "intellij", "eclipse", "maven", "gradle", "webpack", "linux"];
    const methodKeywords = ["agile", "scrum", "kanban", "tdd", "bdd", "ci/cd", "microservices", "rest", "api", "soap", "grpc"];
    const softKeywords = ["leadership", "communication", "teamwork", "problem solving", "analytical", "management", "mentoring"];

    skills.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      if (cloudKeywords.some(k => lowerSkill.includes(k))) {
        categories["Cloud & DevOps"].push(skill);
      } else if (langKeywords.some(k => lowerSkill.includes(k))) {
        categories["Programming Languages"].push(skill);
      } else if (frameworkKeywords.some(k => lowerSkill.includes(k))) {
        categories["Frameworks & Libraries"].push(skill);
      } else if (dbKeywords.some(k => lowerSkill.includes(k))) {
        categories["Databases"].push(skill);
      } else if (toolKeywords.some(k => lowerSkill.includes(k))) {
        categories["Tools & Platforms"].push(skill);
      } else if (methodKeywords.some(k => lowerSkill.includes(k))) {
        categories["Methodologies"].push(skill);
      } else if (softKeywords.some(k => lowerSkill.includes(k))) {
        categories["Soft Skills"].push(skill);
      } else {
        categories["Tools & Platforms"].push(skill);
      }
    });

    return Object.entries(categories).filter(([_, skills]) => skills.length > 0);
  };

  // Real data from AI result — NO fallbacks
  const workExperience: any[] = Array.isArray(result.work_experience) ? result.work_experience : 
                                 Array.isArray(result.work_history) ? result.work_history : [];
  const education: any[] = Array.isArray(result.education) ? result.education : [];
  const skills: string[] = Array.isArray(result.skills) ? result.skills : [];
  const certifications: string[] = Array.isArray(result.certifications) ? result.certifications : [];
  const candidateName = result.name || result.contact?.name || "";
  const candidateEmail = result.email || result.contact?.email || "";
  const candidatePhone = result.phone || result.contact?.phone || "";
  const candidateLinkedin = result.linkedin || result.contact?.linkedin || "";
  const candidateGithub = result.github || result.contact?.github || "";
  const candidateLocation = result.location || (Array.isArray(result.locations) && result.locations[0]) || "";

  const skillCategories = categorizeSkills(skills);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Cloud & DevOps": return <Cloud className="w-4 h-4" />;
      case "Programming Languages": return <Code className="w-4 h-4" />;
      case "Frameworks & Libraries": return <Layers className="w-4 h-4" />;
      case "Databases": return <Database className="w-4 h-4" />;
      case "Tools & Platforms": return <Wrench className="w-4 h-4" />;
      case "Methodologies": return <BookOpen className="w-4 h-4" />;
      case "Soft Skills": return <Users className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
          
          {/* Contact Information */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border border-indigo-100">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-[15px] font-semibold text-gray-800">Contact Information</h2>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                <img 
                  src={"https://ui-avatars.com/api/?name=" + encodeURIComponent(candidateName || 'User') + "&background=6366f1&color=fff&size=128&bold=true"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2.5">
                  {candidateName || <span className="text-gray-400 italic">Name not detected</span>}
                </h3>
                <div className="space-y-1.5">
                  {candidateEmail && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm">{candidateEmail}</span>
                    </div>
                  )}
                  {candidatePhone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm">{candidatePhone}</span>
                    </div>
                  )}
                  {candidateLocation && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm">{candidateLocation}</span>
                    </div>
                  )}
                  {candidateLinkedin && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Linkedin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm truncate">{candidateLinkedin}</span>
                    </div>
                  )}
                  {candidateGithub && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Github className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm truncate">{candidateGithub}</span>
                    </div>
                  )}
                  {!candidateEmail && !candidatePhone && (
                    <p className="text-sm text-gray-400 italic">No contact details extracted</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Work Experience */}
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                    </div>
                    <h2 className="text-[15px] font-semibold text-gray-800">
                      Work Experience ({workExperience.length})
                    </h2>
                  </div>
                  {workExperience.length > 5 && (
                    <button
                      onClick={() => candidateId && navigate(`/candidates/${candidateId}`)}
                      className="text-indigo-600 text-sm font-medium hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  {workExperience.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">No work experience extracted</p>
                  ) : (
                    workExperience.slice(0, 5).map((exp: any, index: number) => (
                      <div key={index} className="relative pl-5 pb-1">
                        <div className="absolute left-0 top-1 w-2 h-2 bg-indigo-400 rounded-full"></div>
                        {index < workExperience.slice(0, 5).length - 1 && (
                          <div className="absolute left-[3px] top-3 w-0.5 h-full bg-gradient-to-b from-indigo-200 to-transparent"></div>
                        )}
                        
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-[15px] leading-tight">
                              {exp.job_title || exp.title || "Unknown Title"}{" "}
                              {(exp.company_name || exp.company) && (
                                <>
                                  <span className="text-gray-600">@</span>{" "}
                                  {exp.company_name || exp.company}
                                </>
                              )}
                            </h3>
                          </div>
                          {(exp.is_current || String(exp.end_date || "").toLowerCase().includes("present")) && (
                            <span className="px-2.5 py-0.5 bg-indigo-500 text-white text-[11px] font-semibold rounded-full ml-2 flex-shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                        {exp.location && (
                          <p className="text-[13px] text-gray-500 mb-0.5">{exp.location}</p>
                        )}
                        {(exp.start_date || exp.end_date || exp.is_current) && (
                          <p className="text-[13px] text-gray-400">
                            {exp.start_date || "—"} – {exp.is_current || String(exp.end_date || "").toLowerCase().includes("present") ? "Present" : (exp.end_date || "—")}
                          </p>
                        )}
                        {exp.duration && !exp.start_date && (
                          <p className="text-[13px] text-gray-400">{exp.duration}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Education */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                    </div>
                    <h2 className="text-[15px] font-semibold text-gray-800">Education ({education.length})</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {education.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">No education entries extracted</p>
                  ) : (
                    education.slice(0, 3).map((edu: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-gray-800">
                            {edu.degree || edu.degree_name || "Degree"}
                            {edu.field_of_study && ` in ${edu.field_of_study}`}
                          </p>
                          {(edu.institution || edu.institution_name || edu.school) && (
                            <p className="text-[13px] text-gray-600">{edu.institution || edu.institution_name || edu.school}</p>
                          )}
                          {(edu.graduation_date || edu.end_date || edu.end_year) && (
                            <p className="text-[12px] text-gray-400 mt-0.5">{edu.graduation_date || edu.end_date || edu.end_year}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Certifications */}
              {certifications.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Award className="w-4 h-4 text-amber-600" />
                    </div>
                    <h2 className="text-[15px] font-semibold text-gray-800">Certifications ({certifications.length})</h2>
                  </div>
                  <div className="space-y-2">
                    {certifications.slice(0, 4).map((cert: string, index: number) => (
                      <div key={index} className="flex items-center gap-2.5 text-[13px] text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        {cert}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Confidence Score */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex flex-col items-center py-2">
                  <div className="relative w-36 h-36 mb-3">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke="#E5E7EB"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke="url(#scoreGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 60}`}
                        strokeDashoffset={`${2 * Math.PI * 60 * (1 - confidenceScore / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818CF8" />
                          <stop offset="100%" stopColor="#6366F1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold ${getQualityColor(confidenceScore)} tracking-tight`}>
                        {confidenceScore}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 font-semibold">{getQualityLabel(confidenceScore)}</p>
                  <p className="text-xs text-gray-400 mt-1">Model Confidence</p>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold text-gray-800">
                    Skills ({skills.length})
                  </h2>
                  {candidateId && (
                    <button
                      onClick={() => navigate(`/candidates/${candidateId}`)}
                      className="text-indigo-600 text-sm font-medium hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {skills.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No skills extracted</p>
                ) : skillCategories.length > 0 ? (
                  <div className="space-y-2.5">
                    {skillCategories.slice(0, 7).map((item: any) => {
                      const category = item[0];
                      const catSkills = item[1];
                      return (
                        <div key={String(category)} className="flex items-center justify-between group hover:bg-gray-50/80 px-3 py-2.5 rounded-lg transition-all cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <div className="text-indigo-500">
                              {getCategoryIcon(String(category))}
                            </div>
                            <span className="text-[13px] text-gray-700 font-medium">{category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-indigo-600">{Array.isArray(catSkills) ? catSkills.length : 0}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Show actual skill tags if categories are empty
                  <div className="flex flex-wrap gap-1.5">
                    {skills.slice(0, 20).map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-100">
                        {skill}
                      </span>
                    ))}
                    {skills.length > 20 && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">
                        +{skills.length - 20} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                  <h2 className="text-[15px] font-semibold text-gray-800 mb-3">Summary</h2>
                  <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-5">
                    {result.summary}
                  </p>
                </div>
              )}
            </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => candidateId && navigate(`/candidates/${candidateId}`)}
              className="flex-1 min-w-[160px] px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
            >
              View Full Profile
            </button>
            <button
              onClick={onUploadAnother}
              className="flex-1 min-w-[140px] px-6 py-3 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
  );
}
