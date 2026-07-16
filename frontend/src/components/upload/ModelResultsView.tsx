import { Brain, Briefcase, Award } from "lucide-react";

interface ModelResultsViewProps {
  modelResults: any;
}

export default function ModelResultsView({ modelResults }: ModelResultsViewProps) {
  console.log("🔍 ModelResultsView received:", modelResults);
  
  if (!modelResults?.deberta_extraction) {
    console.log("❌ No deberta_extraction found in modelResults");
    return null;
  }

  const { work_experience, education, companies, job_titles, institutions, degrees } = modelResults.deberta_extraction;
  console.log("✅ DeBERTa extraction data:", { work_experience, education, companies, job_titles, institutions, degrees });

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">DeBERTa Model Extraction</h2>
          <p className="text-sm text-gray-600">Raw AI model results before merging</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Work Experience Section */}
        <div className="bg-white rounded-xl p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800">Work Experience</h3>
          </div>
          
          {work_experience && work_experience.length > 0 ? (
            <div className="space-y-4">
              {work_experience.map((exp: any, idx: number) => (
                <div key={idx} className="border-l-2 border-purple-300 pl-4 py-2">
                  <div className="space-y-1">
                    {exp.company && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-500">Company:</span>
                        <span className="text-sm font-medium text-gray-900">{exp.company}</span>
                      </div>
                    )}
                    {exp.role && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-500">Role:</span>
                        <span className="text-sm text-gray-700">{exp.role}</span>
                      </div>
                    )}
                    {(exp.start_date || exp.end_date) && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-500">Duration:</span>
                        <span className="text-xs text-gray-600">
                          {exp.start_date || 'N/A'} - {exp.end_date || 'Present'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No work experience extracted</p>
          )}

          {/* Extracted Entities */}
          {companies && companies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Extracted Companies:</p>
              <div className="flex flex-wrap gap-2">
                {companies.map((company: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job_titles && job_titles.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Extracted Job Titles:</p>
              <div className="flex flex-wrap gap-2">
                {job_titles.map((title: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                    {title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Education Section */}
        <div className="bg-white rounded-xl p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-800">Education</h3>
          </div>
          
          {education && education.length > 0 ? (
            <div className="space-y-4">
              {education.map((edu: any, idx: number) => (
                <div key={idx} className="border-l-2 border-indigo-300 pl-4 py-2">
                  <div className="space-y-1">
                    {edu.degree && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-500">Degree:</span>
                        <span className="text-sm font-medium text-gray-900">{edu.degree}</span>
                      </div>
                    )}
                    {edu.institution && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-500">Institution:</span>
                        <span className="text-sm text-gray-700">{edu.institution}</span>
                      </div>
                    )}
                    {(edu.start_date || edu.end_date) && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-500">Year:</span>
                        <span className="text-xs text-gray-600">
                          {edu.start_date || 'N/A'} - {edu.end_date || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No education extracted</p>
          )}

          {/* Extracted Entities */}
          {degrees && degrees.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Extracted Degrees:</p>
              <div className="flex flex-wrap gap-2">
                {degrees.map((degree: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-md">
                    {degree}
                  </span>
                ))}
              </div>
            </div>
          )}

          {institutions && institutions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Extracted Institutions:</p>
              <div className="flex flex-wrap gap-2">
                {institutions.map((inst: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> This shows raw extraction from the DeBERTa NER model before merging with other parsers.
        </p>
      </div>
    </div>
  );
}
