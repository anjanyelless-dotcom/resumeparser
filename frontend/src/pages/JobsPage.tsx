import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJobStore } from "../store/useJobStore";
import toast from "react-hot-toast";
import { Country, State, City } from "country-state-city";

interface Job {
  id: string;
  title: string;
  description: string;
  min_experience_years?: number;
  max_experience_years?: number;
  education_requirement?: string;
  employment_type?: string;
  seniority_level?: string;
  location?: string;
  salary_range?: string;
  department?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  currency?: string;
  salary_period?: string;
  work_mode?: string;
  number_of_openings?: number;
  notice_period?: string;
  salary_min?: number;
  salary_max?: number;
  required_skills?: Array<{
    id: string;
    skill_name: string;
    skill_type: "required" | "preferred";
  }>;
  preferred_skills?: Array<{
    id: string;
    skill_name: string;
    skill_type: "required" | "preferred";
  }>;
}

interface JobFormData {
  title: string;
  department: string;
  location: string;
  country: string;
  state: string;
  city: string;
  employment_type: string;
  work_mode: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  salary_min: string;
  salary_max: string;
  currency: string;
  salary_period: string;
  experience_range: string;
  education_requirement: string;
  number_of_openings: string;
  notice_period: string;
  status: string;
}

const experienceRanges = ["0-2 years", "3-5 years", "5-8 years", "8+ years"];

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Remote",
];
const educationRequirements = [
  "High School",
  "Associate",
  "Bachelor",
  "Master",
  "PhD",
  "None",
];
const departments = [
  "Engineering",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "Product",
  "Design",
];

// ATS Validation Utilities
export const validateJobTitle = (title: string): string | null => {
  if (!title || title.trim().length === 0) return "Job Title is required.";
  const trimmed = title.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return "Please enter a valid Job Title.";
  if (!/^[\w\s.\-&/+()']+$/.test(trimmed)) return "Please enter a valid Job Title.";
  if (/^[^a-zA-Z]+$/.test(trimmed)) return "Please enter a valid Job Title.";
  return null;
};

export const validateSalary = (salary: string): string | null => {
  if (!salary || salary.trim() === "") return null;
  const trimmed = salary.trim();
  if (!/^\d+$/.test(trimmed)) return "Salary must be a positive whole number.";
  if (trimmed.length > 10) return "Salary is too long.";
  return null;
};

export const validateNumberOpenings = (openings: string | number): string | null => {
  const str = String(openings);
  if (!str || str.trim() === "") return "Number of Openings is required.";
  const trimmed = str.trim();
  if (!/^\d+$/.test(trimmed)) return "Number of Openings must be between 1 and 1000.";
  const num = parseInt(trimmed, 10);
  if (num < 1 || num > 1000) return "Number of Openings must be between 1 and 1000.";
  return null;
};

export const validateJobDescription = (desc: string): string | null => {
  if (!desc || desc.trim().length === 0) return "Job Description must contain at least 50 characters.";
  const trimmed = desc.trim();
  if (trimmed.length < 50) return "Job Description must contain at least 50 characters.";
  if (trimmed.length > 5000) return "Job Description cannot exceed 5000 characters.";
  return null;
};

export default function JobsPage() {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentPreferredSkill, setCurrentPreferredSkill] = useState("");

  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  const toggleDescription = (jobId: string) => {
    setExpandedDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleSkills = (jobId: string) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const parseExperience = (range: string) => {
    switch (range) {
      case "0-2 years": return { min: 0, max: 2 };
      case "3-5 years": return { min: 3, max: 5 };
      case "5-8 years": return { min: 5, max: 8 };
      case "8+ years": return { min: 8, max: 20 };
      default: return { min: 0, max: 2 };
    }
  };

  const formatExperience = (min?: number, max?: number) => {
    if (min === 0 && max === 2) return "0-2 years";
    if (min === 3 && max === 5) return "3-5 years";
    if (min === 5 && max === 8) return "5-8 years";
    if (min === 8 && max === 20) return "8+ years";
    return "0-2 years";
  };

  const normalizeSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return "";
    
    const lower = trimmed.toLowerCase();
    const commonCasings: Record<string, string> = {
      javascript: "JavaScript",
      typescript: "TypeScript",
      react: "React",
      nodejs: "Node.js",
      "node.js": "Node.js",
      api: "API",
      ui: "UI",
      ux: "UX",
      html: "HTML",
      css: "CSS",
      aws: "AWS",
      sql: "SQL",
      php: "PHP",
    };
    
    if (commonCasings[lower]) return commonCasings[lower];
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const {
    jobs,
    fetchJobs,
    createJob,
    updateJob,
    isLoading: storeLoading,
  } = useJobStore();

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    department: "",
    location: "",
    country: "",
    state: "",
    city: "",
    employment_type: "",
    work_mode: "Onsite",
    description: "",
    required_skills: [],
    preferred_skills: [],
    salary_min: "",
    salary_max: "",
    currency: "USD",
    salary_period: "Yearly",
    experience_range: "0-2 years",
    education_requirement: "",
    number_of_openings: "1",
    notice_period: "",
    status: "active",
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      await fetchJobs();
    } catch (error) {
      toast.error("Failed to load jobs");
    }
  };

  const selectedCountry = Country.getAllCountries().find(c => c.name === formData.country);
  const selectedState = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode).find(s => s.name === formData.state) : undefined;
  const availableStates = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
  const availableCities = selectedState && selectedCountry ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) : [];

  const isFormValid = 
    Object.keys(formErrors).length === 0 &&
    formData.title.trim().length >= 2 &&
    formData.department &&
    formData.employment_type &&
    formData.experience_range &&
    formData.country &&
    formData.description.length >= 50 &&
    formData.required_skills.length > 0;

  const handleBlur = (field: keyof JobFormData) => {
    let error: string | null = null;
    switch (field) {
      case "title": error = validateJobTitle(formData.title); break;
      case "department": error = formData.department ? null : "Please select Department."; break;
      case "employment_type": error = formData.employment_type ? null : "Please select Employment Type."; break;
      case "experience_range": error = formData.experience_range ? null : "Please select Experience Range."; break;
      case "country": error = formData.country ? null : "Please select Country."; break;
      case "state": error = (formData.country && !formData.state && availableStates.length > 0) ? "Please select State." : null; break;
      case "city": error = (formData.state && !formData.city && availableCities.length > 0) ? "Please select City." : null; break;
      case "salary_min": error = validateSalary(formData.salary_min); break;
      case "salary_max": error = validateSalary(formData.salary_max); break;
      case "number_of_openings": error = validateNumberOpenings(formData.number_of_openings); break;
      case "description": error = validateJobDescription(formData.description); break;
    }
    
    if (field === "salary_min" || field === "salary_max") {
      const sMin = formData.salary_min ? parseInt(formData.salary_min) : 0;
      const sMax = formData.salary_max ? parseInt(formData.salary_max) : 0;
      if (formData.salary_min && formData.salary_max && sMin > sMax) {
        if (field === "salary_max") error = "Salary Max must be greater than or equal to Salary Min.";
      }
    }

    setFormErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
    return error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldsToValidate: (keyof JobFormData)[] = [
      "title", "department", "employment_type", "experience_range", "country", "state", "city", 
      "salary_min", "salary_max", "number_of_openings", "description"
    ];

    let hasErrors = false;
    const newErrors: Partial<Record<keyof JobFormData, string>> = {};

    for (const field of fieldsToValidate) {
      const err = handleBlur(field);
      if (err) {
        newErrors[field] = err;
        hasErrors = true;
      }
    }

    if (formData.required_skills.length === 0) {
      newErrors.required_skills = "At least one Required Skill is mandatory.";
      hasErrors = true;
    } else {
      delete newErrors.required_skills;
    }

    setFormErrors(newErrors);

    if (hasErrors) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    const sMin = formData.salary_min ? parseInt(formData.salary_min) : 0;
    const sMax = formData.salary_max ? parseInt(formData.salary_max) : 0;
    const numOpenings = parseInt(formData.number_of_openings) || 1;

    // Construct Location String
    let finalLocation = formData.country;
    if (formData.state) finalLocation = `${formData.state}, ${finalLocation}`;
    if (formData.city) finalLocation = `${formData.city}, ${finalLocation}`;

    try {
      const exp = parseExperience(formData.experience_range);
      const jobData: Partial<Job> = {
        title: formData.title.trim(),
        department: formData.department,
        location: finalLocation,
        employment_type: formData.employment_type,
        work_mode: formData.work_mode,
        description: formData.description,
        required_skills: formData.required_skills.map(skill => ({
          id: crypto.randomUUID(),
          skill_name: skill,
          skill_type: "required" as const
        })),
        preferred_skills: formData.preferred_skills.map(skill => ({
          id: crypto.randomUUID(),
          skill_name: skill,
          skill_type: "preferred" as const
        })),
        min_experience_years: exp.min,
        max_experience_years: exp.max,
        salary_min: sMin || undefined,
        salary_max: sMax || undefined,
        currency: formData.currency,
        salary_period: formData.salary_period,
        education_requirement: formData.education_requirement,
        number_of_openings: numOpenings,
        notice_period: formData.notice_period,
        status: formData.status,
      };

      if (editingJob) {
        await updateJob(editingJob.id, jobData);
      } else {
        await createJob(jobData);
      }

      setIsCreateModalOpen(false);
      setEditingJob(null);
      resetForm();
      loadJobs();
    } catch (error: any) {
      toast.error(error.message || "Failed to save job");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      department: "",
      location: "",
      country: "",
      state: "",
      city: "",
      employment_type: "",
      work_mode: "Onsite",
      description: "",
      required_skills: [],
      preferred_skills: [],
      salary_min: "",
      salary_max: "",
      currency: "USD",
      salary_period: "Yearly",
      experience_range: "0-2 years",
      education_requirement: "",
      number_of_openings: "1",
      notice_period: "",
      status: "active",
    });
    setCurrentSkill("");
    setCurrentPreferredSkill("");
  };

  const openCreateModal = () => {
    resetForm();
    setEditingJob(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    let jobCountry = "", jobState = "", jobCity = "";
    if (job.location) {
      const parts = job.location.split(",").map(p => p.trim());
      if (parts.length === 3) {
        jobCity = parts[0];
        jobState = parts[1];
        jobCountry = parts[2];
      } else if (parts.length === 2) {
        jobCity = parts[0];
        jobCountry = parts[1];
      } else {
        jobCountry = job.location;
      }
    }

    setFormData({
      title: job.title,
      department: job.department || "",
      location: job.location || "",
      country: jobCountry,
      state: jobState,
      city: jobCity,
      employment_type: job.employment_type || "",
      work_mode: job.work_mode || "Onsite",
      description: job.description,
      required_skills: job.required_skills?.map(s => typeof s === 'string' ? s : s.skill_name) || [],
      preferred_skills: job.preferred_skills?.map(s => typeof s === 'string' ? s : s.skill_name) || [],
      salary_min: job.salary_min ? String(job.salary_min) : "",
      salary_max: job.salary_max ? String(job.salary_max) : "",
      currency: job.currency || "USD",
      salary_period: job.salary_period || "Yearly",
      experience_range: formatExperience(job.min_experience_years, job.max_experience_years),
      education_requirement: job.education_requirement || "",
      number_of_openings: job.number_of_openings ? String(job.number_of_openings) : "1",
      notice_period: job.notice_period || "",
      status: job.status || "active",
    });
    setEditingJob(job);
    setIsCreateModalOpen(true);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to close/deactivate this job?")) return;

    try {
      await updateJob(jobId, { status: "closed" });
      loadJobs();
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate job");
    }
  };

  const addSkill = () => {
    const normalized = normalizeSkill(currentSkill);
    if (!normalized) return;
    
    const existsInRequired = formData.required_skills.some(
      s => s.toLowerCase() === normalized.toLowerCase()
    );
    const existsInPreferred = formData.preferred_skills.some(
      s => s.toLowerCase() === normalized.toLowerCase()
    );
    
    if (!existsInRequired && !existsInPreferred) {
      if (formData.required_skills.length >= 50) {
        toast.error("Maximum 50 required skills allowed.");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        required_skills: [...prev.required_skills, normalized],
      }));
      setCurrentSkill("");
      if (formErrors.required_skills) setFormErrors(prev => ({ ...prev, required_skills: undefined }));
    } else {
      if (existsInPreferred) {
        toast.error("Skill is already in preferred skills");
      }
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => {
      const nextSkills = prev.required_skills.filter((skill) => skill !== skillToRemove);
      if (nextSkills.length === 0) {
        setFormErrors(errors => ({ ...errors, required_skills: "At least one Required Skill is mandatory." }));
      }
      return { ...prev, required_skills: nextSkills };
    });
  };

  const addPreferredSkill = () => {
    const normalized = normalizeSkill(currentPreferredSkill);
    if (!normalized) return;
    
    const existsInRequired = formData.required_skills.some(
      s => s.toLowerCase() === normalized.toLowerCase()
    );
    const existsInPreferred = formData.preferred_skills.some(
      s => s.toLowerCase() === normalized.toLowerCase()
    );
    
    if (!existsInRequired && !existsInPreferred) {
      if (formData.preferred_skills.length >= 50) {
        toast.error("Maximum 50 preferred skills allowed.");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        preferred_skills: [...prev.preferred_skills, normalized],
      }));
      setCurrentPreferredSkill("");
    } else {
      if (existsInRequired) {
        toast.error("Skill is already in required skills");
      }
      setCurrentPreferredSkill("");
    }
  };

  const removePreferredSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      preferred_skills: prev.preferred_skills.filter(
        (skill) => skill !== skillToRemove,
      ),
    }));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-gray-600">Create and manage job postings</p>
        </div>
        {!isCreateModalOpen && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Job
          </button>
        )}
      </div>

      {/* Inline Create/Edit Form */}
      {isCreateModalOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <form onSubmit={handleSubmit}>
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex justify-between items-center border-b border-gray-100 pb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingJob ? "Edit Job" : "Create New Job"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, title: e.target.value }));
                      if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined }));
                    }}
                    onBlur={() => handleBlur("title")}
                    className={`w-full px-3 py-2 border ${formErrors.title ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="e.g. Senior Software Engineer"
                  />
                  {formErrors.title && <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>}
                </div>

                {/* Grid 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <select
                      value={formData.department}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, department: e.target.value }));
                        if (formErrors.department) setFormErrors(prev => ({ ...prev, department: undefined }));
                      }}
                      onBlur={() => handleBlur("department")}
                      className={`w-full px-3 py-2 border ${formErrors.department ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    {formErrors.department && <p className="mt-1 text-xs text-red-500">{formErrors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type *</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, employment_type: e.target.value }));
                        if (formErrors.employment_type) setFormErrors(prev => ({ ...prev, employment_type: undefined }));
                      }}
                      onBlur={() => handleBlur("employment_type")}
                      className={`w-full px-3 py-2 border ${formErrors.employment_type ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    >
                      <option value="">Select Type</option>
                      {employmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {formErrors.employment_type && <p className="mt-1 text-xs text-red-500">{formErrors.employment_type}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
                    <select
                      value={formData.work_mode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, work_mode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Onsite">Onsite</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Grid 2 */}
                <div className="grid grid-cols-1 gap-4 mb-2">
                  <label className="block text-sm font-medium text-gray-700 -mb-2">Location *</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <select
                        value={formData.country}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, country: e.target.value, state: "", city: "" }));
                          if (formErrors.country) setFormErrors(prev => ({ ...prev, country: undefined, state: undefined, city: undefined }));
                        }}
                        onBlur={() => handleBlur("country")}
                        className={`w-full px-3 py-2 border ${formErrors.country ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                      >
                        <option value="">Select Country</option>
                        {Country.getAllCountries().map((c) => (
                          <option key={c.isoCode} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      {formErrors.country && <p className="mt-1 text-xs text-red-500">{formErrors.country}</p>}
                    </div>

                    <div>
                      <select
                        value={formData.state}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, state: e.target.value, city: "" }));
                          if (formErrors.state) setFormErrors(prev => ({ ...prev, state: undefined, city: undefined }));
                        }}
                        onBlur={() => handleBlur("state")}
                        className={`w-full px-3 py-2 border ${formErrors.state ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                        disabled={!formData.country || availableStates.length === 0}
                      >
                        <option value="">Select State/Province</option>
                        {availableStates.map((s) => (
                          <option key={s.isoCode} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      {formErrors.state && <p className="mt-1 text-xs text-red-500">{formErrors.state}</p>}
                    </div>

                    <div>
                      <select
                        value={formData.city}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, city: e.target.value }));
                          if (formErrors.city) setFormErrors(prev => ({ ...prev, city: undefined }));
                        }}
                        onBlur={() => handleBlur("city")}
                        className={`w-full px-3 py-2 border ${formErrors.city ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                        disabled={!formData.state || availableCities.length === 0}
                      >
                        <option value="">Select City</option>
                        {availableCities.map((city) => (
                          <option key={city.name} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                      {formErrors.city && <p className="mt-1 text-xs text-red-500">{formErrors.city}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Range *</label>
                    <select
                      value={formData.experience_range}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, experience_range: e.target.value }));
                        if (formErrors.experience_range) setFormErrors(prev => ({ ...prev, experience_range: undefined }));
                      }}
                      onBlur={() => handleBlur("experience_range")}
                      className={`w-full px-3 py-2 border ${formErrors.experience_range ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    >
                      {experienceRanges.map((range) => <option key={range} value={range}>{range}</option>)}
                    </select>
                    {formErrors.experience_range && <p className="mt-1 text-xs text-red-500">{formErrors.experience_range}</p>}
                  </div>
                </div>

                {/* Grid 3 - Salary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min</label>
                    <input
                      type="number"
                      value={formData.salary_min}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, salary_min: e.target.value }));
                        if (formErrors.salary_min) setFormErrors(prev => ({ ...prev, salary_min: undefined }));
                      }}
                      onBlur={() => handleBlur("salary_min")}
                      className={`w-full px-3 py-2 border ${formErrors.salary_min ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                      placeholder="e.g. 100000"
                    />
                    {formErrors.salary_min && <p className="mt-1 text-xs text-red-500">{formErrors.salary_min}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max</label>
                    <input
                      type="number"
                      value={formData.salary_max}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, salary_max: e.target.value }));
                        if (formErrors.salary_max) setFormErrors(prev => ({ ...prev, salary_max: undefined }));
                      }}
                      onBlur={() => handleBlur("salary_max")}
                      className={`w-full px-3 py-2 border ${formErrors.salary_max ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                      placeholder="e.g. 150000"
                    />
                    {formErrors.salary_max && <p className="mt-1 text-xs text-red-500">{formErrors.salary_max}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Period</label>
                    <select
                      value={formData.salary_period}
                      onChange={(e) => setFormData((prev) => ({ ...prev, salary_period: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Yearly">Yearly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Hourly">Hourly</option>
                    </select>
                  </div>
                </div>

                {/* Grid 4 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Education Requirement</label>
                    <select
                      value={formData.education_requirement}
                      onChange={(e) => setFormData((prev) => ({ ...prev, education_requirement: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Education</option>
                      {educationRequirements.map((req) => <option key={req} value={req}>{req}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Openings</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.number_of_openings}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, number_of_openings: e.target.value }));
                        if (formErrors.number_of_openings) setFormErrors(prev => ({ ...prev, number_of_openings: undefined }));
                      }}
                      onBlur={() => handleBlur("number_of_openings")}
                      className={`w-full px-3 py-2 border ${formErrors.number_of_openings ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                    {formErrors.number_of_openings && <p className="mt-1 text-xs text-red-500">{formErrors.number_of_openings}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
                    <select
                      value={formData.notice_period}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notice_period: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Notice Period</option>
                      <option value="Immediate">Immediate</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="60 Days">60 Days</option>
                      <option value="90 Days">90 Days</option>
                    </select>
                  </div>
                </div>

                {/* Status (Only on Edit) */}
                {editingJob && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="on hold">On Hold</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, description: e.target.value }));
                      if (formErrors.description) setFormErrors(prev => ({ ...prev, description: undefined }));
                    }}
                    onBlur={() => handleBlur("description")}
                    rows={4}
                    className={`w-full px-3 py-2 border ${formErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="Job description, responsibilities, requirements... (min 50 chars)"
                  />
                  {formErrors.description && <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>}
                </div>

                {/* Required Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills *</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Type required skill and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="ml-2 text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    ))}
                  </div>
                  {formErrors.required_skills && <p className="mt-2 text-xs text-red-500">{formErrors.required_skills}</p>}
                </div>

                {/* Preferred Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Skills (Good to Have)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentPreferredSkill}
                      onChange={(e) => setCurrentPreferredSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPreferredSkill())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Type preferred skill and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addPreferredSkill}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.preferred_skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full flex items-center">
                        {skill}
                        <button type="button" onClick={() => removePreferredSkill(skill)} className="ml-2 text-purple-600 hover:text-purple-800">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-8 flex items-center justify-end space-x-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${!isFormValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {editingJob ? "Save Changes" : "Create Job"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Jobs List */}
      {storeLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>

                  </div>
                  <p className="text-sm text-gray-600">{job.department}</p>
                </div>
                <button
                  onClick={() => updateJob(job.id, { status: job.status === "active" ? "closed" : "active" })}
                  className={`px-2 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer hover:opacity-80 ${getStatusColor(job.status)}`}
                  title="Click to toggle status"
                >
                  {job.status}
                </button>
              </div>

              {/* Description Preview */}
              {job.description && (
                <div 
                  className="mb-4 cursor-pointer group"
                  onClick={() => toggleDescription(job.id)}
                >
                  <p className={`text-sm text-gray-600 ${expandedDescriptions.has(job.id) ? '' : 'line-clamp-2'}`}>
                    {job.description}
                  </p>
                  {job.description.length > 100 && (
                    <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-block font-medium">
                      {expandedDescriptions.has(job.id) ? "Show less" : "Show more"}
                    </span>
                  )}
                </div>
              )}

              {/* Job Details Grid */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4">
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <span className="truncate">{job.location || "Location not set"}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  <span className="truncate">{job.employment_type || "Type not set"}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span className="truncate">{job.min_experience_years}-{job.max_experience_years} years</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                  <span className="truncate">{job.education_requirement || "Education not set"}</span>
                </div>
                {job.work_mode && (
                  <div className="flex items-center text-xs text-gray-600">
                    <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                    <span className="truncate">{job.work_mode}</span>
                  </div>
                )}
                {(job.salary_min || job.salary_max) && (
                  <div className="flex items-center text-xs text-gray-600 col-span-2">
                    <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span className="truncate">
                      {job.salary_min ? job.salary_min : '0'} - {job.salary_max ? job.salary_max : '0'} {job.currency || 'USD'} {job.salary_period ? `/${job.salary_period}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="mb-4 space-y-3 flex-1">
                {job.required_skills && job.required_skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Must Have</p>
                    <div className="flex flex-wrap gap-1">
                      {(expandedSkills.has(job.id) ? job.required_skills : job.required_skills.slice(0, 3)).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {typeof skill === 'string' ? skill : skill.skill_name}
                        </span>
                      ))}
                      {!expandedSkills.has(job.id) && job.required_skills.length > 3 && (
                        <span 
                          onClick={() => toggleSkills(job.id)}
                          className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                        >
                          +{job.required_skills.length - 3} more
                        </span>
                      )}
                      {expandedSkills.has(job.id) && job.required_skills.length > 3 && (
                        <span 
                          onClick={() => toggleSkills(job.id)}
                          className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                        >
                          Show less
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {job.preferred_skills && job.preferred_skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Good to Have</p>
                    <div className="flex flex-wrap gap-1">
                      {(expandedSkills.has(job.id) ? job.preferred_skills : job.preferred_skills.slice(0, 3)).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          {typeof skill === 'string' ? skill : skill.skill_name}
                        </span>
                      ))}
                      {!expandedSkills.has(job.id) && job.preferred_skills.length > 3 && (
                        <span 
                          onClick={() => toggleSkills(job.id)}
                          className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                        >
                          +{job.preferred_skills.length - 3} more
                        </span>
                      )}
                      {expandedSkills.has(job.id) && job.preferred_skills.length > 3 && (
                        <span 
                          onClick={() => toggleSkills(job.id)}
                          className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                        >
                          Show less
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                <span>Created: {formatDate(job.created_at)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
                <button
                  onClick={() => navigate("/matching", { state: { jobId: job.id } })}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center bg-indigo-50 px-3 py-1.5 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Match
                </button>
                <div className="flex space-x-3">
                  <button onClick={() => openEditModal(job)} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteJob(job.id)} className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first job posting</p>
        </div>
      )}
    </div>
  );
}
