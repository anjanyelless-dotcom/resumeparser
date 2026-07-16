import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  summary?: string;
  raw_resume_text?: string;
  skills?: string[];
  companies?: string[];
  job_titles?: string[];
  education_degrees?: string[];
  universities?: string[];
  parsing_status?: {
    status: string;
    confidence_score?: number;
    error_message?: string;
  };
  created_at: string;
}

interface LabelingProgress {
  labeled: number;
  total: number;
  accuracy_estimate: number;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  companies: string[];
  job_titles: string[];
  education_degrees: string[];
  universities: string[];
}

export default function LabelingPage() {
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(
    null,
  );
  const [progress, setProgress] = useState<LabelingProgress>({
    labeled: 0,
    total: 0,
    accuracy_estimate: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentJobTitle, setCurrentJobTitle] = useState("");
  const [currentDegree, setCurrentDegree] = useState("");
  const [currentUniversity, setCurrentUniversity] = useState("");

  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    skills: [],
    companies: [],
    job_titles: [],
    education_degrees: [],
    universities: [],
  });

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      loadProgress();
      loadNextCandidate();
    }
  }, []);

  const loadProgress = async () => {
    try {
      const response = await api.get("/labeling/progress");
      setProgress(response.data);
    } catch (error) {
      console.error("Failed to load progress");
    }
  };

  const loadNextCandidate = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/labeling/next");
      const data = response.data;
      
      setCurrentCandidate(data);
      setFormData({
        name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
        skills: data.skills || [],
        companies: data.companies || [],
        job_titles: data.job_titles || [],
        education_degrees: data.education_degrees || [],
        universities: data.universities || [],
      });
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // No more candidates to label
        setCurrentCandidate(null);
        toast.success("All candidates have been labeled!");
      } else {
        toast.error("Failed to load next candidate");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (type: keyof FormData, value: string) => {
    if (!value.trim()) return;

    const currentArray = formData[type] as string[];
    if (!currentArray.includes(value.trim())) {
      setFormData((prev) => ({
        ...prev,
        [type]: [...currentArray, value.trim()],
      }));
    }
  };

  const removeTag = (type: keyof FormData, valueToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      [type]: (prev[type] as string[]).filter((item) => item !== valueToRemove),
    }));
  };

  const handleCorrectAndNext = async () => {
    if (!currentCandidate) return;

    try {
      await api.post("/labeling/save", {
        candidate_id: currentCandidate.id,
        corrected_fields: formData,
        action: "corrected",
      });

      toast.success("Corrections saved!");
      loadProgress();
      loadNextCandidate();
    } catch (error) {
      toast.error("Failed to save corrections");
    }
  };

  const handleSkip = async () => {
    if (!currentCandidate) return;

    try {
      await api.post("/labeling/save", {
        candidate_id: currentCandidate.id,
        action: "skipped",
      });

      toast("Candidate skipped", {
        icon: "⏭️",
        style: {
          background: "#f3f4f6",
          color: "#374151",
        },
      });
      loadProgress();
      loadNextCandidate();
    } catch (error) {
      toast.error("Failed to skip candidate");
    }
  };

  const handleApprove = async () => {
    if (!currentCandidate) return;

    try {
      await api.post("/labeling/save", {
        candidate_id: currentCandidate.id,
        corrected_fields: formData,
        action: "approved",
      });

      toast.success("Candidate approved for training!");
      loadProgress();
      loadNextCandidate();
    } catch (error) {
      toast.error("Failed to approve candidate");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 bg-green-100";
    if (confidence >= 0.7) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentCandidate) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              All Caught Up!
            </h2>
            <p className="mt-2 text-gray-600">
              All candidates have been labeled. Great job!
            </p>
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Final Progress
              </h3>
              <div className="text-2xl font-bold text-indigo-600">
                {progress.labeled} / {progress.total}
              </div>
              <p className="text-sm text-gray-600">candidates labeled</p>
              <p className="text-sm text-gray-600 mt-1">
                Estimated accuracy:{" "}
                {Math.round(progress.accuracy_estimate * 100)}%
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resume Data Labeling
            </h1>
            <p className="text-gray-600">
              Admin use only - Manually correct parsed resume data
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-white rounded-lg shadow-sm px-6 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {progress.labeled} / {progress.total}
              </div>
              <p className="text-sm text-gray-600">labeled</p>
              <div className="mt-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${progress.total > 0 ? (progress.labeled / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Accuracy: {Math.round(progress.accuracy_estimate * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Panel - Raw Resume Text */}
        <div className="w-1/2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Raw Resume Text
              </h2>
              {currentCandidate.parsing_status?.confidence_score && (
                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(currentCandidate.parsing_status.confidence_score)}`}
                >
                  AI Confidence:{" "}
                  {Math.round(
                    currentCandidate.parsing_status.confidence_score * 100,
                  )}
                  %
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {currentCandidate.raw_resume_text || "No raw text available"}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Editable Form */}
        <div className="w-1/2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Corrected Data
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentSkill}
                    onChange={(e) => setCurrentSkill(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(),
                      addTag("skills", currentSkill),
                      setCurrentSkill(""))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Type skill and press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTag("skills", currentSkill);
                      setCurrentSkill("");
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeTag("skills", skill)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Companies */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Companies
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(),
                      addTag("companies", currentCompany),
                      setCurrentCompany(""))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Type company and press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTag("companies", currentCompany);
                      setCurrentCompany("");
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.companies.map((company, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center"
                    >
                      {company}
                      <button
                        type="button"
                        onClick={() => removeTag("companies", company)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Job Titles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Titles
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentJobTitle}
                    onChange={(e) => setCurrentJobTitle(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(),
                      addTag("job_titles", currentJobTitle),
                      setCurrentJobTitle(""))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Type job title and press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTag("job_titles", currentJobTitle);
                      setCurrentJobTitle("");
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.job_titles.map((title, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full flex items-center"
                    >
                      {title}
                      <button
                        type="button"
                        onClick={() => removeTag("job_titles", title)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Education Degrees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education Degrees
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentDegree}
                    onChange={(e) => setCurrentDegree(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(),
                      addTag("education_degrees", currentDegree),
                      setCurrentDegree(""))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Type degree and press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTag("education_degrees", currentDegree);
                      setCurrentDegree("");
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.education_degrees.map((degree, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full flex items-center"
                    >
                      {degree}
                      <button
                        type="button"
                        onClick={() => removeTag("education_degrees", degree)}
                        className="ml-2 text-yellow-600 hover:text-yellow-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Universities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Universities
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentUniversity}
                    onChange={(e) => setCurrentUniversity(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(),
                      addTag("universities", currentUniversity),
                      setCurrentUniversity(""))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Type university and press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addTag("universities", currentUniversity);
                      setCurrentUniversity("");
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.universities.map((university, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full flex items-center"
                    >
                      {university}
                      <button
                        type="button"
                        onClick={() => removeTag("universities", university)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCorrectAndNext}
              className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Correct & Next
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
