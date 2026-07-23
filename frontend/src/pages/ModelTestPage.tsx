import { useState } from "react";
import axios from "axios";
import { FileText, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ModelTestPage() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to test");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use the correct backend endpoint
      const response = await axios.post(
        `/upload/parse-sections`,
        {
          model: "own-model",
          experience_text: inputText,
          education_text: "" // Can be extended to have separate fields
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setResult(response.data);
    } catch (err: any) {
      console.error("Error testing model:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === "ERR_NETWORK") {
        setError("Unable to connect to the server. Please check if the backend is running.");
      } else {
        setError("Failed to test model. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">DeBERTa Model Test</h1>
          </div>
          <p className="text-gray-600">
            Test your trained DeBERTa model (31 labels, 97.34% F1 score) by pasting resume text below
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste Resume Text
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste work experience or education text here...&#10;&#10;Example:&#10;Senior Data Engineer&#10;Infosys - Jan 2021 to Mar 2023 - Hyderabad&#10;Google (Client)&#10;&#10;B.Tech Computer Science&#10;JNTU Hyderabad, 2015-2019, Grade 8.2"
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {inputText.length} characters
            </span>
            <button
              onClick={handleTest}
              disabled={isLoading || !inputText.trim()}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Test Model
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Model Output</h2>
            </div>

            {/* Status Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                {result.message}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Processing time: {result.processing_time_ms?.toFixed(2)}ms
              </p>
            </div>

            {/* Work Experience Results */}
            {result.work_experience && result.work_experience.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">
                  Work Experience ({result.work_experience.length} entries)
                </h3>
                <div className="space-y-4">
                  {result.work_experience.map((exp: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {exp.job_title && (
                          <div>
                            <span className="font-medium text-gray-700">Job Title:</span>
                            <span className="ml-2 text-gray-900">{exp.job_title}</span>
                          </div>
                        )}
                        {exp.company && (
                          <div>
                            <span className="font-medium text-gray-700">Company:</span>
                            <span className="ml-2 text-gray-900">{exp.company}</span>
                          </div>
                        )}
                        {exp.client && (
                          <div>
                            <span className="font-medium text-gray-700">Client:</span>
                            <span className="ml-2 text-gray-900">{exp.client}</span>
                          </div>
                        )}
                        {exp.location && (
                          <div>
                            <span className="font-medium text-gray-700">Location:</span>
                            <span className="ml-2 text-gray-900">{exp.location}</span>
                          </div>
                        )}
                        {exp.start_date && (
                          <div>
                            <span className="font-medium text-gray-700">Start Date:</span>
                            <span className="ml-2 text-gray-900">{exp.start_date}</span>
                          </div>
                        )}
                        {exp.end_date && (
                          <div>
                            <span className="font-medium text-gray-700">End Date:</span>
                            <span className="ml-2 text-gray-900">{exp.end_date}</span>
                          </div>
                        )}
                      </div>
                      {exp.responsibilities && exp.responsibilities.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-700 text-sm">Responsibilities:</span>
                          <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                            {exp.responsibilities.map((resp: string, i: number) => (
                              <li key={i}>{resp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education Results */}
            {result.education && result.education.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">
                  Education ({result.education.length} entries)
                </h3>
                <div className="space-y-4">
                  {result.education.map((edu: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {edu.degree && (
                          <div>
                            <span className="font-medium text-gray-700">Degree:</span>
                            <span className="ml-2 text-gray-900">{edu.degree}</span>
                          </div>
                        )}
                        {edu.field && (
                          <div>
                            <span className="font-medium text-gray-700">Field:</span>
                            <span className="ml-2 text-gray-900">{edu.field}</span>
                          </div>
                        )}
                        {edu.institution && (
                          <div>
                            <span className="font-medium text-gray-700">Institution:</span>
                            <span className="ml-2 text-gray-900">{edu.institution}</span>
                          </div>
                        )}
                        {edu.start_year && (
                          <div>
                            <span className="font-medium text-gray-700">Start Year:</span>
                            <span className="ml-2 text-gray-900">{edu.start_year}</span>
                          </div>
                        )}
                        {edu.end_year && (
                          <div>
                            <span className="font-medium text-gray-700">End Year:</span>
                            <span className="ml-2 text-gray-900">{edu.end_year}</span>
                          </div>
                        )}
                        {edu.grade && (
                          <div>
                            <span className="font-medium text-gray-700">Grade:</span>
                            <span className="ml-2 text-gray-900">{edu.grade}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Output */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                View Raw JSON Output
              </summary>
              <pre className="mt-3 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
