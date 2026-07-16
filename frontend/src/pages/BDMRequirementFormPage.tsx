import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClientStore } from "../store/useClientStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, X, Save } from "lucide-react";
import { api } from "../services/api";

const experienceRanges = [
  { min: 0, max: 2, label: "0-2 years" },
  { min: 3, max: 5, label: "3-5 years" },
  { min: 5, max: 8, label: "5-8 years" },
  { min: 8, max: 20, label: "8+ years" },
];

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

export default function BDMRequirementFormPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clients, fetchClients } = useClientStore();

  const [currentSkill, setCurrentSkill] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "",
    employment_type: "Full-time",
    description: "",
    required_skills: [] as string[],
    salary_min: "",
    salary_max: "",
    experience_range: "0-2 years",
    education_requirement: "Bachelor",
    number_of_openings: "1",
    status: "active",
    client_id: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    await fetchClients({ limit: 1000 });
  };

  // Filter clients owned by current user in qualified/proposal_sent/negotiation/won stages
  const myClients = clients.filter(
    (client) =>
      client.owner_user_id === user?.id &&
      !client.is_archived &&
      client.pipeline_stage &&
      ["qualified", "proposal_sent", "negotiation", "won"].includes(client.pipeline_stage)
  );

  // Also include prospect clients as fallback (not hard-blocked)
  const prospectClients = clients.filter(
    (client) =>
      client.owner_user_id === user?.id &&
      !client.is_archived &&
      client.pipeline_stage === "prospect"
  );

  const handleAddSkill = () => {
    const trimmed = currentSkill.trim();
    if (trimmed && !formData.required_skills.includes(trimmed)) {
      setFormData({
        ...formData,
        required_skills: [...formData.required_skills, trimmed],
      });
      setCurrentSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Job title is required");
      return;
    }

    if (formData.description.trim().length < 50) {
      toast.error("Description must be at least 50 characters");
      return;
    }

    if (formData.required_skills.length === 0) {
      toast.error("At least one required skill is needed");
      return;
    }

    setIsLoading(true);

    try {
      const experienceRange = experienceRanges.find(
        (r) => r.label === formData.experience_range
      ) || experienceRanges[0];

      const jobData = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        employment_type: formData.employment_type.toLowerCase(),
        description: formData.description,
        required_skills: formData.required_skills,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : undefined,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : undefined,
        min_experience_years: experienceRange.min,
        max_experience_years: experienceRange.max,
        education_requirement: formData.education_requirement,
        number_of_openings: parseInt(formData.number_of_openings),
        status: formData.status,
        client_id: formData.client_id || undefined,
      };

      await api.post("/jobs", jobData);

      toast.success("Requirement created successfully");
      navigate("/bdm/requirements");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create requirement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/bdm/requirements")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requirements
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Requirement</h1>
          <p className="text-gray-600 mt-1">
            Create a new job requirement for your clients
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Client Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client (Optional)
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select a client (optional)</option>
              <optgroup label="Recommended (Qualified+ Stages)">
                {myClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name} ({client.pipeline_stage})
                  </option>
                ))}
              </optgroup>
              {prospectClients.length > 0 && (
                <optgroup label="Prospect Stage (Early)">
                  {prospectClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name} (Prospect)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Recommended: Select clients in qualified or later stages
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          {/* Department & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., New York, NY"
              />
            </div>
          </div>

          {/* Employment Type & Experience */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Type
              </label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                value={formData.experience_range}
                onChange={(e) => setFormData({ ...formData, experience_range: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {experienceRanges.map((range) => (
                  <option key={range.label} value={range.label}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Education & Openings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Education Requirement
              </label>
              <select
                value={formData.education_requirement}
                onChange={(e) => setFormData({ ...formData, education_requirement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {educationRequirements.map((edu) => (
                  <option key={edu} value={edu}>
                    {edu}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Openings
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.number_of_openings}
                onChange={(e) => setFormData({ ...formData, number_of_openings: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Salary (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary_min}
                onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., 50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Salary (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary_max}
                onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., 80000"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Skills *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Type a skill and press Enter"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {formData.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-indigo-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description *
            </label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Describe the role, responsibilities, and requirements (minimum 50 characters)"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/50 characters minimum
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/bdm/requirements")}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? "Creating..." : "Create Requirement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}