import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useClientStore } from "../store/useClientStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, X, Save } from "lucide-react";
import { api } from "../services/api";
import { getCurrentLocation, reverseGeocodeLocation, getLocationByPincode } from "./JobsPage";

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
  "Temporary",
];

const educationRequirements = [
  "High School",
  "Associate",
  "Bachelor",
  "Master",
  "PhD",
  "Any",
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
  const [searchParams] = useSearchParams();
  const { id: requirementId } = useParams<{ id: string }>();
  const isEditMode = !!requirementId;
  const initialClientId = searchParams.get("client_id") || "";
  const { user } = useAuthStore();
  const { clients, fetchClients } = useClientStore();

  const [currentSkill, setCurrentSkill] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

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
    client_id: initialClientId,
    country: "",
    state: "",
    city: "",
    district: "",
    pincode: "",
    latitude: "",
    longitude: "",
    location_source: "manual",
  });

  useEffect(() => {
    loadClients();
    if (isEditMode && requirementId) {
      loadExistingRequirement(requirementId);
    }
  }, [isEditMode, requirementId]);

  const loadClients = async () => {
    await fetchClients({ limit: 1000 });
  };

  const loadExistingRequirement = async (id: string) => {
    setIsFetchingData(true);
    try {
      const response = await api.get(`/jobs/${id}/details`);
      const job = response.data.job;
      if (job) {
        setFormData(prev => ({
          ...prev,
          title: job.title || "",
          department: job.department || "",
          location: job.location || "",
          employment_type: job.employment_type || "Full-time",
          description: job.description || "",
          required_skills: Array.isArray(job.required_skills) ? job.required_skills : [],
          salary_min: job.salary_min ? String(job.salary_min) : "",
          salary_max: job.salary_max ? String(job.salary_max) : "",
          experience_range: job.experience_years ? `${job.experience_years}+ years` : "0-2 years",
          education_requirement: job.education_requirement || "Bachelor",
          number_of_openings: "1",
          client_id: job.client_id || initialClientId,
        }));
      }
    } catch (error) {
      toast.error("Failed to load requirement data");
    } finally {
      setIsFetchingData(false);
    }
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

  const handleDetectCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      const locationData = await reverseGeocodeLocation(latitude, longitude);

      if (locationData) {
        setFormData(prev => ({
          ...prev,
          country: locationData.countryCode || "",
          state: locationData.adminName1 || "",
          city: locationData.placeName || "",
          district: locationData.adminName2 || "",
          pincode: locationData.postalCode || "",
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          location_source: "geolocation",
          location: `${locationData.placeName || ""}, ${locationData.adminName1 || ""}`.replace(/^, | , $/g, ''),
        }));
        toast.success("Location detected successfully");
      } else {
        toast.error("Unable to detect location from coordinates");
      }
    } catch (error: any) {
      console.error("Geolocation error:", error);
      toast.error(error.message || "Unable to detect location");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleDetectByPincode = async () => {
    const pincode = formData.pincode.trim();
    if (!pincode) {
      toast.error("Please enter a PIN code");
      return;
    }
    if (!/^\d{5,10}$/.test(pincode)) {
      toast.error("PIN code must be between 5 and 10 digits");
      return;
    }

    try {
      setLocationLoading(true);
      const locationData = await getLocationByPincode(pincode);

      if (locationData) {
        setFormData(prev => ({
          ...prev,
          country: locationData.countryCode || "",
          state: locationData.adminName1 || "",
          city: locationData.placeName || "",
          district: locationData.adminName2 || "",
          location_source: "pincode",
          location: `${locationData.placeName || ""}, ${locationData.adminName1 || ""}`.replace(/^, | , $/g, ''),
        }));
        toast.success("Location retrieved from PIN code");
      } else {
        toast.error("Could not find location details for this PIN code");
      }
    } catch (error) {
      console.error("PIN code error:", error);
      toast.error("Error retrieving location from PIN code");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "pending_approval") => {
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
        location: formData.location || "Not specified",
        country: formData.country,
        state: formData.state,
        city: formData.city,
        district: formData.district,
        pincode: formData.pincode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        location_source: formData.location_source,
        employment_type: formData.employment_type.toLowerCase(),
        description: formData.description,
        required_skills: formData.required_skills,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : 0,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : 0,
        min_experience_years: experienceRange.min,
        max_experience_years: experienceRange.max,
        education_level: formData.education_requirement.toLowerCase().replace(' ', '-'),
        number_of_openings: parseInt(formData.number_of_openings) || 1,
        status: status,
        client_id: formData.client_id || undefined,
      };

      if (isEditMode && requirementId) {
        await api.put(`/jobs/${requirementId}`, jobData);
        toast.success(`Requirement ${status === 'draft' ? 'updated as draft' : 'updated and submitted for approval'}`);
      } else {
        await api.post("/jobs", jobData);
        toast.success(`Requirement ${status === 'draft' ? 'saved as draft' : 'submitted for approval'}`);
      }
      navigate("/bdm/requirements");
    } catch (error: any) {
      toast.error(error.response?.data?.error || (isEditMode ? "Failed to update requirement" : "Failed to create requirement"));
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? "Edit Requirement" : "New Requirement"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode ? "Update the job requirement details" : "Create a new job requirement for your clients"}
          </p>
        </div>

        {isFetchingData && (
          <div className="flex items-center justify-center py-8 bg-white rounded-lg border border-gray-200 mb-6">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">Loading requirement data...</span>
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
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

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-indigo-900 mb-3">
                📍 Location Detection
              </label>
              
              <div className="space-y-3">
                {/* Use Current Location Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={locationLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {locationLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Detecting Location...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Use Current Location
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center">
                  <div className="flex-grow border-t border-indigo-300"></div>
                  <span className="flex-shrink-0 mx-4 text-indigo-600 text-sm font-medium">OR</span>
                  <div className="flex-grow border-t border-indigo-300"></div>
                </div>

                {/* PIN Code Detection */}
                <div className="flex gap-2">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData(prev => ({ ...prev, pincode: value }));
                      }}
                      placeholder="Enter PIN Code (5-10 digits)"
                      className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      disabled={locationLoading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectByPincode}
                    disabled={locationLoading || !formData.pincode}
                    className="px-4 py-2 bg-white text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    {locationLoading ? "Detecting..." : "Auto Detect"}
                  </button>
                </div>

                {/* Manual Fallback / Edit */}
                <div>
                  <label className="block text-sm text-indigo-800 mb-1 font-medium">Location Details *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g., New York, NY"
                  />
                  <p className="text-xs text-indigo-600 mt-1">This will be shown on the job post. Auto-filled if location detected above.</p>
                </div>
              </div>
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/bdm/requirements")}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <div className="flex-1 flex justify-end gap-3">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, "draft")}
                disabled={isLoading}
                className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, "pending_approval")}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}