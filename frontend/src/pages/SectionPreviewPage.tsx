import { useState } from "react";
import { Upload, FileText, Loader2, ChevronDown, ChevronUp, Download, AlertCircle, CheckCircle, Info } from "lucide-react";
import { api } from "../services/api";

interface SectionPreviewResponse {
  filename: string;
  extraction_method: string;
  raw_text_length: number;
  raw_text: string;
  total_sections: number;
  sections: {
    [key: string]: {
      text: string;
      char_count: number;
    };
  };
  detected_sections: string[];
  missing_sections: string[];
  validation_metadata: {
    spacy_available: boolean;
    validation_ran: boolean;
    sections_corrected: Array<{
      from: string;
      to: string;
      reason: string;
      violations: number;
    }>;
    sections_split: Array<{
      section: string;
      split_line: number;
      resolved_to: string;
    }>;
    sections_resolved: Array<{
      from: string;
      to: string;
    }>;
    warnings: string[];
    summary?: {
      input_sections: number;
      output_sections: number;
      total_corrections: number;
      total_splits: number;
      total_resolutions: number;
    };
  };
}

interface ParsedSectionsResponse {
  status: string;
  work_experience: Array<{
    job_title?: string;
    company_name?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    duration?: string;
    responsibilities?: string[];
    technologies?: string[];
    [key: string]: any;
  }>;
  education: Array<{
    degree?: string;
    institution?: string;
    location?: string;
    graduation_date?: string;
    field_of_study?: string;
    [key: string]: any;
  }>;
  skills: string[];
  summary?: string | null;
  certifications: string[];
  projects: string[];
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
  };
  processing_time_ms: number;
  message: string;
}

export default function SectionPreviewPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SectionPreviewResponse | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSectionsResponse | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  // Map canonical UI section names → possible AI service key names (in priority order)
  const SECTION_ALIASES: Record<string, string[]> = {
    summary:        ["summary", "summary_objective", "objective", "professional_summary", "profile"],
    experience:     ["experience", "work_experience", "work_history", "employment", "professional_experience"],
    education:      ["education", "educational_background", "academic_background", "academics"],
    skills:         ["skills", "technical_skills", "core_skills", "key_skills", "competencies"],
    certifications: ["certifications", "certification", "certificates", "licenses"],
    projects:       ["projects", "project_experience", "key_projects"],
    contact:        ["contact", "contact_information", "personal_information", "personal_details"],
  };

  // Resolve a canonical section name to the actual key present in the sections object
  const resolveSection = (sections: Record<string, any>, canonical: string) => {
    const aliases = SECTION_ALIASES[canonical] || [canonical];
    for (const alias of aliases) {
      if (sections[alias] && sections[alias].text?.trim()) return sections[alias];
    }
    return null;
  };

  // Check if ANY alias is in detected_sections
  const isSectionDetected = (detectedSections: string[], canonical: string) => {
    const aliases = SECTION_ALIASES[canonical] || [canonical];
    return aliases.some(a => detectedSections.includes(a));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
        setError(null);
        setPreviewData(null);
      } else {
        setError("Please upload a PDF or DOCX file only");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
        setError(null);
        setPreviewData(null);
      } else {
        setError("Please upload a PDF or DOCX file only");
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    return validTypes.includes(file.type);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);

      const response = await api.post<SectionPreviewResponse>(
        `/upload/preview-sections`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setPreviewData(response.data);
    } catch (err: any) {
      console.error("Error analyzing sections:", err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === "ERR_NETWORK") {
        setError("Unable to connect to the server. Please check if the backend is running.");
      } else {
        setError("Failed to analyze sections. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!previewData || !selectedFile) return;

    // Create filename by replacing extension with -sections.json
    const originalName = selectedFile.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const filename = `${nameWithoutExt}-sections.json`;

    // Create blob and download
    const jsonString = JSON.stringify(previewData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleParseSections = async () => {
    if (!previewData) {
      setError("Please analyze sections first");
      return;
    }

    setIsParsing(true);
    setError(null);
    setParsedData(null);

    try {
      // Resolve all canonical sections using aliases so we pass the right text
      const resolve = (canonical: string) =>
        resolveSection(previewData.sections, canonical)?.text || null;

      const payload = {
        experience_text:     resolve("experience"),
        education_text:      resolve("education"),
        skills_text:         resolve("skills"),
        contact_text:        resolve("contact"),
        summary_text:        resolve("summary"),
        certifications_text: resolve("certifications"),
        projects_text:       resolve("projects"),
        // raw_text lets the AI extract name even if contact section is missing
        raw_text:            previewData.raw_text || null,
      };

      console.log("[parse-sections] payload section keys present:",
        Object.entries(payload)
          .filter(([, v]) => !!v)
          .map(([k]) => k)
          .join(", ")
      );

      const response = await api.post<ParsedSectionsResponse>(
        `/upload/parse-sections`,
        payload
      );

      setParsedData(response.data);
    } catch (err: any) {
      console.error("Error parsing sections:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === "ERR_NETWORK") {
        setError("Unable to connect to AI service. Please check if it's running on port 8000.");
      } else {
        setError("Failed to parse sections. Please try again.");
      }
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resume Section Extractor — Preview and Verify
          </h1>
          <p className="text-gray-600">
            Upload a resume to preview extracted sections without running entity extraction
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-700 mb-2">
                Click to upload or drag and drop your resume here
              </p>
              <p className="text-sm text-gray-500">PDF or DOCX files only</p>
            </label>
          </div>

          {/* Selected File Display */}
          {selectedFile && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData(null);
                  setError(null);
                }}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          )}

          {/* Analyze Button */}
          {selectedFile && !isLoading && !previewData && (
            <div className="mt-6">
              <button
                onClick={handleAnalyze}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Analyze Sections
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Extracting text and organizing sections
              </p>
              <p className="text-gray-600">Please wait...</p>
            </div>
          </div>
        )}

        {/* Preview Data */}
        {previewData && !isLoading && (
          <div className="space-y-6">
            {/* Summary Bar - Section Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Section Detection Summary</h2>
              <div className="grid grid-cols-6 gap-4">
                {["summary", "experience", "education", "skills", "certifications", "projects"].map((section) => {
                  const isDetected = isSectionDetected(previewData.detected_sections, section);
                  const sectionData = resolveSection(previewData.sections, section);
                  return (
                    <div
                      key={section}
                      className={`p-4 rounded-lg border-2 ${
                        isDetected
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-xs uppercase text-gray-700 font-semibold mb-2">
                          {section}
                        </p>
                        {sectionData && (
                          <p className="text-xs text-gray-500 mb-1">
                            {sectionData.char_count.toLocaleString()} chars
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isDetected ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              isDetected ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {isDetected ? "Detected" : "Missing"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats Pills */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">File name</p>
                <p className="font-medium text-gray-900 truncate">{previewData.filename}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Extraction method used</p>
                <p className="font-medium text-gray-900">{previewData.extraction_method}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Raw text character count</p>
                <p className="font-medium text-gray-900">{previewData.raw_text_length.toLocaleString()}</p>
              </div>
            </div>

            {/* Validation Status */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Section Validation Status
              </h2>
              
              {/* Validation Status Indicators */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  {previewData.validation_metadata.spacy_available ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    spaCy NLP: {previewData.validation_metadata.spacy_available ? "Available" : "Not Available"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {previewData.validation_metadata.validation_ran ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    Validation: {previewData.validation_metadata.validation_ran ? "Completed" : "Skipped"}
                  </span>
                </div>
              </div>

              {/* Validation Summary */}
              {previewData.validation_metadata.summary && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Validation Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700">Input sections:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {previewData.validation_metadata.summary.input_sections}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Output sections:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {previewData.validation_metadata.summary.output_sections}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Corrections:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {previewData.validation_metadata.summary.total_corrections}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Splits:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {previewData.validation_metadata.summary.total_splits}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Resolutions:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {previewData.validation_metadata.summary.total_resolutions}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Corrections */}
              {previewData.validation_metadata.sections_corrected.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Section Corrections</p>
                  <div className="space-y-2">
                    {previewData.validation_metadata.sections_corrected.map((correction, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                        <p className="text-yellow-900">
                          <span className="font-medium">{correction.from}</span>
                          {" → "}
                          <span className="font-medium">{correction.to}</span>
                        </p>
                        <p className="text-yellow-700 text-xs mt-1">{correction.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Splits */}
              {previewData.validation_metadata.sections_split.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Section Splits Detected</p>
                  <div className="space-y-2">
                    {previewData.validation_metadata.sections_split.map((split, idx) => (
                      <div key={idx} className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                        <p className="text-purple-900">
                          Section <span className="font-medium">{split.section}</span> split at line {split.split_line}
                        </p>
                        <p className="text-purple-700 text-xs mt-1">
                          Second part resolved to: <span className="font-medium">{split.resolved_to}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unknown Section Resolutions */}
              {previewData.validation_metadata.sections_resolved.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Unknown Sections Resolved</p>
                  <div className="space-y-2">
                    {previewData.validation_metadata.sections_resolved.map((resolution, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                        <p className="text-green-900">
                          <span className="font-medium">{resolution.from}</span>
                          {" → "}
                          <span className="font-medium">{resolution.to}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {previewData.validation_metadata.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Warnings</p>
                  <div className="space-y-2">
                    {previewData.validation_metadata.warnings.map((warning, idx) => (
                      <div key={idx} className="bg-orange-50 border border-orange-200 rounded p-3 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-orange-900">{warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Parse Sections Button */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">AI Model Parsing</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Send extracted sections to AI model for structured parsing
                  </p>
                </div>
                <button
                  onClick={handleParseSections}
                  disabled={isParsing || !previewData.sections.experience && !previewData.sections.education}
                  className="bg-purple-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Parse Sections
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Parsed Results */}
            {parsedData && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-green-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Parsed Structured Data
                </h2>
                
                <div className="mb-4 bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-900">
                    {parsedData.message} (Processing time: {parsedData.processing_time_ms.toFixed(2)}ms)
                  </p>
                </div>

                {/* Contact */}
                {parsedData.contact && (parsedData.contact.name || parsedData.contact.email || parsedData.contact.phone) && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Contact Details</h3>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 grid grid-cols-2 gap-3 text-sm">
                      {parsedData.contact.name && (
                        <div><span className="text-gray-600">Name:</span><span className="font-medium text-gray-900 ml-2">{parsedData.contact.name}</span></div>
                      )}
                      {parsedData.contact.email && (
                        <div><span className="text-gray-600">Email:</span><span className="font-medium text-gray-900 ml-2">{parsedData.contact.email}</span></div>
                      )}
                      {parsedData.contact.phone && (
                        <div><span className="text-gray-600">Phone:</span><span className="font-medium text-gray-900 ml-2">{parsedData.contact.phone}</span></div>
                      )}
                      {parsedData.contact.linkedin && (
                        <div className="col-span-2"><span className="text-gray-600">LinkedIn:</span><span className="font-medium text-gray-900 ml-2 break-all">{parsedData.contact.linkedin}</span></div>
                      )}
                      {parsedData.contact.github && (
                        <div className="col-span-2"><span className="text-gray-600">GitHub:</span><span className="font-medium text-gray-900 ml-2 break-all">{parsedData.contact.github}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {parsedData.summary && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm text-gray-700 leading-relaxed">
                      {parsedData.summary}
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {parsedData.work_experience.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Work Experience ({parsedData.work_experience.length} entries)
                    </h3>
                    <div className="space-y-4">
                      {parsedData.work_experience.map((exp, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {exp.job_title && (
                              <div>
                                <span className="text-gray-600">Job Title:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.job_title}</span>
                              </div>
                            )}
                            {exp.company_name && (
                              <div>
                                <span className="text-gray-600">Company:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.company_name}</span>
                              </div>
                            )}
                            {exp.location && (
                              <div>
                                <span className="text-gray-600">Location:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.location}</span>
                              </div>
                            )}
                            {(exp.start_date || exp.end_date) && (
                              <div>
                                <span className="text-gray-600">Period:</span>
                                <span className="font-medium text-gray-900 ml-2">
                                  {exp.start_date || "—"} – {exp.is_current || String(exp.end_date || "").toLowerCase().includes("present") ? "Present" : (exp.end_date || "—")}
                                </span>
                              </div>
                            )}
                            {exp.duration && !exp.start_date && (
                              <div>
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.duration}</span>
                              </div>
                            )}
                          </div>
                          {exp.responsibilities && exp.responsibilities.length > 0 && (
                            <div className="mt-3">
                              <span className="text-gray-600 text-sm">Responsibilities:</span>
                              <ul className="list-disc list-inside mt-1 text-sm text-gray-700 space-y-1">
                                {exp.responsibilities.slice(0, 3).map((resp: string, i: number) => (
                                  <li key={i}>{resp}</li>
                                ))}
                                {exp.responsibilities.length > 3 && (
                                  <li className="text-gray-500">...and {exp.responsibilities.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                          {exp.technologies && exp.technologies.length > 0 && (
                            <div className="mt-2">
                              <span className="text-gray-600 text-sm">Technologies:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {exp.technologies.slice(0, 10).map((tech: string, i: number) => (
                                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {parsedData.education.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Education ({parsedData.education.length} entries)
                    </h3>
                    <div className="space-y-3">
                      {parsedData.education.map((edu, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {edu.degree && (
                              <div>
                                <span className="text-gray-600">Degree:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.degree}</span>
                              </div>
                            )}
                            {edu.institution && (
                              <div>
                                <span className="text-gray-600">Institution:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.institution}</span>
                              </div>
                            )}
                            {edu.field_of_study && (
                              <div>
                                <span className="text-gray-600">Field:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.field_of_study}</span>
                              </div>
                            )}
                            {edu.graduation_date && (
                              <div>
                                <span className="text-gray-600">Graduation:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.graduation_date}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {parsedData.skills && parsedData.skills.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Skills ({parsedData.skills.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map((skill, idx) => (
                        <span key={idx} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {parsedData.certifications && parsedData.certifications.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Certifications ({parsedData.certifications.length})
                    </h3>
                    <ul className="space-y-1">
                      {parsedData.certifications.map((cert, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Projects */}
                {parsedData.projects && parsedData.projects.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Projects ({parsedData.projects.length})
                    </h3>
                    <div className="space-y-2">
                      {parsedData.projects.map((proj, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm text-gray-700">
                          {proj}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section Cards */}
            <div className="space-y-4">
              {["summary", "experience", "education", "skills", "certifications", "projects"].map((sectionName) => {
                const sectionData = resolveSection(previewData.sections, sectionName);
                const isDetected = isSectionDetected(previewData.detected_sections, sectionName);

                return (
                  <div
                    key={sectionName}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 uppercase">
                          {sectionName}
                        </h3>
                        {sectionData && (
                          <span className="text-sm text-gray-500">
                            {sectionData.char_count.toLocaleString()} characters
                          </span>
                        )}
                      </div>
                      <div>
                        {isDetected && sectionData?.text?.trim() ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Empty
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                      {isDetected && sectionData?.text?.trim() ? (
                        <textarea
                          readOnly
                          value={sectionData.text}
                          className="w-full h-[250px] p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-500 italic">
                          No content detected for this section
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Raw Extracted Text - Collapsible */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Raw Extracted Text — Before Section Splitting
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {showRawText ? "Hide Raw Text" : "Show Raw Text"}
                  </span>
                  {showRawText ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </div>
              </button>
              
              {showRawText && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                    <pre className="text-[14px] text-gray-800 whitespace-pre-wrap font-mono">
                      {previewData.raw_text}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Download JSON Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={downloadJSON}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" />
                Download JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
