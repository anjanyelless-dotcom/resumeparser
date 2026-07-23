import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PermissionGuard from "../components/common/PermissionGuard";
import { useJobStore } from "../store/useJobStore";
import toast from "react-hot-toast";
import { api } from "../services/api";
import AssignTeamLeadModal from "../components/team/AssignTeamLeadModal";
import AssignRecruitersModal from "../components/team/AssignRecruitersModal";
import JobProgressDrawer from "../components/jobs/JobProgressDrawer";
import JobDetailsDrawer from "../components/jobs/JobDetailsDrawer";
import { JobCard } from "../components/jobs/JobCard";
import { MoreVertical } from "lucide-react";
import { Country, State, City } from "country-state-city";

interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  education_level?: string;
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
  client_id?: string;
  manual_client_name?: string;
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
  // Enhanced location fields
  country?: string;
  state?: string;
  city?: string;
  district?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  location_source?: "manual" | "pincode" | "geolocation";
  // Dashboard Metrics
  priority?: string;
  team_lead_id?: string;
  team_lead_name?: string;
  team_lead_assignment_status?: string;
  recruiters_assigned_count?: number;
  recruiter_capacity_max?: number;
  total_openings?: number;
  filled_positions?: number;
  remaining_positions?: number;
  total_candidates?: number;
  parsed?: number;
  jd_matched?: number;
  ai_matched?: number;
  shortlisted?: number;
  submitted?: number;
  interviews?: number;
  offers?: number;
  joined?: number;
  placements?: number;
  current_recruitment_stage?: string;
  next_action?: string;
  next_action_type?: "MODAL" | "PAGE" | "NONE";
  next_action_route?: string;
  action_enabled?: boolean;
  action_message?: string;
  job_health_indicator?: string;
  recruitment_progress_percentage?: number;
  completed_stages?: string[];
  pending_stages?: string[];
  available_actions?: Array<{
    id: string;
    label: string;
    type: string;
    enabled: boolean;
    message: string;
  }>;
}

interface JobFormData {
  title: string;
  department: string;
  location: string;
  country: string;
  state: string;
  city: string;
  district?: string;
  employment_type: string;
  work_mode: string;
  description: string;
  requirements: string;
  required_skills: string[];
  preferred_skills: string[];
  salary_min: string;
  salary_max: string;
  currency: string;
  salary_period: string;
  min_experience_years: string;
  max_experience_years: string;
  education_level: string;
  number_of_openings: string;
  notice_period: string;
  status: string;
  client_id: string;
  // Enhanced location fields
  pincode: string;
  latitude?: string;
  longitude?: string;
  location_source?: "manual" | "pincode" | "geolocation";
}

const educationLevels = [
  { value: "any", label: "Any" },
  { value: "high-school", label: "High School" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "phd", label: "PhD" },
];

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Remote",
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

// GeoNames API Configuration
const GEONAMES_USERNAME = import.meta.env.VITE_GEONAMES_USERNAME || "demo";

// GeoNames API Types
interface GeoNamesLocation {
  placeName: string;
  adminName1: string;
  adminName2: string;
  countryCode: string;
  postalCode: string;
  lat: string;
  lng: string;
}

interface GeoNamesNearbyResponse {
  postalCodes: GeoNamesLocation[];
  status?: {
    message: string;
    value: number;
  };
}

interface GeoNamesPostalResponse {
  postalCodes: GeoNamesLocation[];
  status?: {
    message: string;
    value: number;
  };
}

// Helper: Get location by PIN code using OpenStreetMap Nominatim (fallback)
const getLocationByPincodeNominatim = async (
  pincode: string
): Promise<GeoNamesLocation | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&format=json&limit=1&country=IN`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      
      // Parse display_name to extract location components
      // Format: "500085, Ward 114 KPHB Colony, Hyderabad, Kukatpally mandal, Medchal–Malkajgiri, Telangana, India"
      const parts = result.display_name.split(',').map((p: string) => p.trim());
      
      // Extract components from display_name
      let city = '';
      let state = '';
      
      // Try to extract city and state from display_name
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.includes('Hyderabad') || part.includes('Bangalore') || 
            part.includes('Mumbai') || part.includes('Delhi') ||
            part.includes('Chennai') || part.includes('Kolkata')) {
          city = part;
        }
        if (part.includes('Telangana') || part.includes('Karnataka') ||
            part.includes('Maharashtra') || part.includes('Delhi') ||
            part.includes('Tamil Nadu') || part.includes('West Bengal')) {
          state = part;
        }
      }
      
      return {
        postalCode: result.name || pincode,
        placeName: city || parts[2] || 'Unknown', // Usually city is 3rd element
        countryCode: 'IN',
        lat: parseFloat(result.lat).toString(),
        lng: parseFloat(result.lon).toString(),
        adminName1: state || parts[parts.length - 2] || '', // Usually state is 2nd to last
        adminName2: city || parts[2] || '', // Usually city is 3rd element
      };
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching location by PIN code from Nominatim:", error);
    return null;
  }
};

// Helper: Get location by PIN code (with Nominatim fallback)
export const getLocationByPincode = async (
  pincode: string
): Promise<GeoNamesLocation | null> => {
  try {
    const response = await fetch(
      `https://secure.geonames.org/postalCodeSearchJSON?postalcode=${pincode}&maxRows=1&username=${GEONAMES_USERNAME}`
    );
    const data: GeoNamesPostalResponse = await response.json();

    // Check if GeoNames returned an error (e.g., demo account limit exceeded or user doesn't exist)
    if (data.status && data.status.message) {
      console.warn("GeoNames error, falling back to Nominatim:", data.status.message);
      return getLocationByPincodeNominatim(pincode);
    }

    if (data.postalCodes && data.postalCodes.length > 0) {
      return data.postalCodes[0];
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching location by PIN code from GeoNames, falling back to Nominatim:", error);
    return getLocationByPincodeNominatim(pincode);
  }
};

// Helper: Get current location using browser geolocation
export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information unavailable"));
            break;
          case error.TIMEOUT:
            reject(new Error("Location request timed out"));
            break;
          default:
            reject(new Error("An unknown error occurred"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

// Helper: Reverse geocode coordinates to location using OpenStreetMap Nominatim (fallback)
const reverseGeocodeLocationNominatim = async (
  lat: number,
  lng: number
): Promise<GeoNamesLocation | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
    );
    const data = await response.json();

    if (data && data.address) {
      const address = data.address;
      return {
        postalCode: address.postcode || '',
        placeName: address.city || address.town || address.village || address.suburb || data.display_name?.split(',')[0] || 'Unknown',
        countryCode: address.country_code || 'IN',
        lat: lat.toString(),
        lng: lng.toString(),
        adminName1: address.state || address.state_district || '',
        adminName2: address.city || address.town || address.district || address.county || '',
      };
    }
    return null;
  } catch (error: any) {
    console.error("Error reverse geocoding location from Nominatim:", error);
    return null;
  }
};

export const reverseGeocodeLocation = async (
  lat: number,
  lng: number
): Promise<GeoNamesLocation | null> => {
  try {
    const response = await fetch(
      `https://secure.geonames.org/findNearbyPostalCodesJSON?lat=${lat}&lng=${lng}&username=${GEONAMES_USERNAME}`
    );
    const data: GeoNamesNearbyResponse = await response.json();

    // Check if GeoNames returned an error (e.g., demo account limit exceeded or user doesn't exist)
    if (data.status && data.status.message) {
      console.warn("GeoNames error, falling back to Nominatim:", data.status.message);
      return reverseGeocodeLocationNominatim(lat, lng);
    }

    if (data.postalCodes && data.postalCodes.length > 0) {
      return data.postalCodes[0];
    }
    return null;
  } catch (error: any) {
    console.error("Error reverse geocoding location from GeoNames, falling back to Nominatim:", error);
    return reverseGeocodeLocationNominatim(lat, lng);
  }
};

export default function JobsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJobForTeamLead, setSelectedJobForTeamLead] = useState<Job | null>(null);
  const [showAssignRecruitersModal, setShowAssignRecruitersModal] = useState(false);
  const [selectedJobForRecruiters, setSelectedJobForRecruiters] = useState<Job | null>(null);
  const [selectedJobForProgress, setSelectedJobForProgress] = useState<Job | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    // Open create form via navigation state (from dashboard quick actions)
    if (location.state?.showCreateModal) {
      setIsCreateModalOpen(true);
      window.history.replaceState({}, document.title);
      return;
    }
    // Also support ?create=true query param (from /jobs?create=true links)
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, location.search]);

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentPreferredSkill, setCurrentPreferredSkill] = useState("");
  const [clients, setClients] = useState<Array<{ id: string; company_name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
const [clientSearch, setClientSearch] = useState("");
const [showManualClientInput, setShowManualClientInput] = useState(false);
const [manualClientName, setManualClientName] = useState("");

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




  const handleActionClick = async (job: Job, action: any) => {
    if (!action.enabled) {
      if (action.message) {
        toast.error(action.message);
      }
      return;
    }

    switch (action.id) {
      case "assign_team_lead":
      case "tl_assign":
      case "tl_reassign":
        setSelectedJobForTeamLead(job);
        setShowAssignModal(true);
        break;
      case "tl_remove":
        if (window.confirm("Are you sure you want to remove the Team Lead assignment?")) {
          try {
            await api.patch(`/jobs/${job.id}/remove-team-lead`, {
              removal_reason: "Manual Removal"
            });
            toast.success("Team Lead removed successfully");
            fetchJobs();
          } catch (error: any) {
            toast.error(error.response?.data?.error || error.message || "Failed to remove Team Lead");
          }
        }
        break;
      case "rec_assign":
      case "rec_manage":
      case "rec_assign_additional":
        setSelectedJobForRecruiters(job);
        setShowAssignRecruitersModal(true);
        break;
      case "edit_job":
        openEditModal(job);
        break;
      case "close_job":
        handleDeleteJob(job.id);
        break;
      case "view_progress":
        navigate(`/jobs/${job.id}`);
        break;
      default:
        console.warn("Unknown action:", action.id);
    }
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
    updateJobStatus,
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
    district: "",
    employment_type: "",
    work_mode: "Onsite",
    description: "",
    requirements: "",
    required_skills: [],
    preferred_skills: [],
    salary_min: "",
    salary_max: "",
    currency: "USD",
    salary_period: "Yearly",
    min_experience_years: "0",
    max_experience_years: "5",
    education_level: "any",
    number_of_openings: "1",
    notice_period: "",
    status: "active",
    client_id: "",
    pincode: "",
    latitude: undefined,
    longitude: undefined,
    location_source: undefined,
  });
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadJobs();
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await api.get("/clients");
      if (response.data && response.data.clients) {
        setClients(response.data.clients);
      }
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadJobs = async () => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const statusParam = searchParams.get('status');
      
      const params: any = {};
      if (statusParam) params.status = statusParam;
      
      await fetchJobs(params);
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
    (formData.client_id || (showManualClientInput && manualClientName.trim())) &&
    formData.min_experience_years !== "" &&
    formData.max_experience_years !== "" &&
    formData.education_level &&
    (formData.location_source || formData.country) && // Either auto-detected OR manual selection
    formData.description.length >= 50 &&
    formData.required_skills.length > 0;

  const handleBlur = (field: keyof JobFormData) => {
    let error: string | null = null;
    switch (field) {
      case "title": error = validateJobTitle(formData.title); break;
      case "department": error = formData.department ? null : "Please select Department."; break;
      case "employment_type": error = formData.employment_type ? null : "Please select Employment Type."; break;
      case "client_id": 
        if (showManualClientInput) {
          error = manualClientName.trim() ? null : "Please enter client name.";
        } else {
          error = formData.client_id ? null : "Please select a client.";
        }
        break;
      case "min_experience_years": 
        if (formData.min_experience_years === "") error = "Please enter minimum experience years.";
        else {
          const min = parseInt(formData.min_experience_years);
          if (isNaN(min) || min < 0 || min > 50) error = "Minimum experience must be between 0 and 50 years.";
        }
        break;
      case "max_experience_years":
        if (formData.max_experience_years === "") error = "Please enter maximum experience years.";
        else {
          const max = parseInt(formData.max_experience_years);
          if (isNaN(max) || max < 0 || max > 50) error = "Maximum experience must be between 0 and 50 years.";
        }
        break;
      case "education_level": error = formData.education_level ? null : "Please select Education Level."; break;
      case "client_id": error = (formData.client_id === "" && !showManualClientInput) ? "Please select a client." : null; break;
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

    if (field === "min_experience_years" || field === "max_experience_years") {
      const minExp = formData.min_experience_years ? parseInt(formData.min_experience_years) : 0;
      const maxExp = formData.max_experience_years ? parseInt(formData.max_experience_years) : 0;
      if (formData.min_experience_years && formData.max_experience_years && minExp > maxExp) {
        if (field === "max_experience_years") error = "Max experience must be greater than or equal to Min experience.";
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

  // Handler: Detect location using current geolocation
  const handleDetectCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      const locationData = await reverseGeocodeLocation(latitude, longitude);

      if (locationData) {
        setFormData(prev => ({
          ...prev,
          country: locationData.countryCode,
          state: locationData.adminName1,
          city: locationData.placeName,
          district: locationData.adminName2,
          pincode: locationData.postalCode,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          location_source: "geolocation",
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

  // Handler: Detect location using PIN code
  const handleDetectByPincode = async () => {
    const pincode = formData.pincode.trim();

    // Validate PIN code format
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
          country: locationData.countryCode,
          state: locationData.adminName1,
          city: locationData.placeName,
          district: locationData.adminName2,
          pincode: locationData.postalCode,
          latitude: locationData.lat,
          longitude: locationData.lng,
          location_source: "pincode",
        }));
        toast.success("Location detected successfully from PIN code");
      } else {
        toast.error("Invalid PIN code or location not found");
      }
    } catch (error: any) {
      console.error("PIN code lookup error:", error);
      toast.error("Failed to lookup PIN code");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldsToValidate: (keyof JobFormData)[] = [
      "title", "department", "employment_type", "client_id", "min_experience_years", "max_experience_years", 
      "education_level", "salary_min", "salary_max", "number_of_openings", "description"
    ];

    // Only validate location fields if not auto-detected
    if (!formData.location_source) {
      fieldsToValidate.push("country", "state", "city");
    }

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
    const minExp = formData.min_experience_years ? parseInt(formData.min_experience_years) : 0;
    const maxExp = formData.max_experience_years ? parseInt(formData.max_experience_years) : 0;
    const numOpenings = parseInt(formData.number_of_openings) || 1;

    // Construct Location String
    let finalLocation = formData.country;
    if (formData.state) finalLocation = `${formData.state}, ${finalLocation}`;
    if (formData.city) finalLocation = `${formData.city}, ${finalLocation}`;

    try {
      const jobData: Partial<Job> = {
        title: formData.title.trim(),
        department: formData.department,
        location: finalLocation,
        employment_type: formData.employment_type,
        work_mode: formData.work_mode,
        description: formData.description,
        requirements: formData.requirements,
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
        min_experience_years: minExp,
        max_experience_years: maxExp,
        education_level: formData.education_level,
        salary_min: sMin || undefined,
        salary_max: sMax || undefined,
        currency: formData.currency,
        salary_period: formData.salary_period,
        number_of_openings: numOpenings,
        notice_period: formData.notice_period,
        status: formData.status,
        client_id: formData.client_id === "manual" ? undefined : formData.client_id,
        manual_client_name: formData.client_id === "manual" ? manualClientName : undefined,
        // Enhanced location fields
        country: formData.country,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        location_source: formData.location_source,
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
      district: "",
      employment_type: "",
      work_mode: "Onsite",
      description: "",
      requirements: "",
      required_skills: [],
      preferred_skills: [],
      salary_min: "",
      salary_max: "",
      currency: "USD",
      salary_period: "Yearly",
      min_experience_years: "0",
      max_experience_years: "5",
      education_level: "any",
      number_of_openings: "1",
      notice_period: "",
      status: "active",
      client_id: "",
      pincode: "",
      latitude: undefined,
      longitude: undefined,
      location_source: undefined,
    });
    setCurrentSkill("");
    setCurrentPreferredSkill("");
    setClientSearch("");
    setShowManualClientInput(false);
    setManualClientName("");
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
      requirements: (job as any).requirements || "",
      required_skills: job.required_skills?.map(s => typeof s === 'string' ? s : s.skill_name) || [],
      preferred_skills: job.preferred_skills?.map(s => typeof s === 'string' ? s : s.skill_name) || [],
      salary_min: job.salary_min ? String(job.salary_min) : "",
      salary_max: job.salary_max ? String(job.salary_max) : "",
      currency: job.currency || "USD",
      salary_period: job.salary_period || "Yearly",
      min_experience_years: job.min_experience_years !== undefined ? String(job.min_experience_years) : "0",
      max_experience_years: job.max_experience_years !== undefined ? String(job.max_experience_years) : "5",
      education_level: (job as any).education_level || "any",
      number_of_openings: job.number_of_openings ? String(job.number_of_openings) : "1",
      notice_period: job.notice_period || "",
      status: job.status || "active",
      client_id: (job as any).client_id || "",
      // Enhanced location fields
      pincode: (job as any).pincode || "",
      latitude: (job as any).latitude,
      longitude: (job as any).longitude,
      location_source: (job as any).location_source,
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


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-gray-600">Create and manage job postings</p>
        </div>
        <PermissionGuard module="jobs" action="create">
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Job</span>
            </button>
          </PermissionGuard>
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

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  
                  {!showManualClientInput ? (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search client..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                        />
                        <select
                          value={formData.client_id}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, client_id: e.target.value }));
                            if (formErrors.client_id) setFormErrors(prev => ({ ...prev, client_id: undefined }));
                          }}
                          onBlur={() => handleBlur("client_id")}
                          disabled={loadingClients}
                          className={`w-full px-3 py-2 border ${formErrors.client_id ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                        >
                          <option value="">Select Client</option>
                          {clients
                            .filter(client => 
                              client.company_name.toLowerCase().includes(clientSearch.toLowerCase())
                            )
                            .map((client) => (
                              <option key={client.id} value={client.id}>{client.company_name}</option>
                            ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingClients && <p className="mt-1 text-xs text-gray-500">Loading clients...</p>}
                        <button
                          type="button"
                          onClick={() => setShowManualClientInput(true)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Client not in list? Enter manually
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={manualClientName}
                        onChange={(e) => {
                          setManualClientName(e.target.value);
                          setFormData((prev) => ({ ...prev, client_id: "manual" }));
                          if (formErrors.client_id) setFormErrors(prev => ({ ...prev, client_id: undefined }));
                        }}
                        onBlur={() => handleBlur("client_id")}
                        placeholder="Enter client name"
                        className={`w-full px-3 py-2 border ${formErrors.client_id ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowManualClientInput(false);
                          setManualClientName("");
                          setFormData((prev) => ({ ...prev, client_id: "" }));
                        }}
                        className="text-xs text-gray-600 hover:text-gray-800 underline mt-1"
                      >
                        Cancel manual entry
                      </button>
                    </>
                  )}
                  {formErrors.client_id && <p className="mt-1 text-xs text-red-500">{formErrors.client_id}</p>}
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, description: e.target.value }));
                      if (formErrors.description) setFormErrors(prev => ({ ...prev, description: undefined }));
                    }}
                    onBlur={() => handleBlur("description")}
                    rows={6}
                    className={`w-full px-3 py-2 border ${formErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="Describe the role, responsibilities, and requirements..."
                  />
                  {formErrors.description && <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>}
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements & Qualifications</label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requirements: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="List specific requirements, qualifications, and certifications..."
                  />
                </div>

                {/* Location Detection Section */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
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

                    {/* Detected Location Info */}
                    {(formData.country || formData.state || formData.city) && (
                      <div className="mt-3 p-3 bg-white rounded-md border border-indigo-200">
                        <p className="text-xs font-semibold text-indigo-700 mb-2">Detected Location Details:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {formData.country && (
                            <div>
                              <span className="text-gray-500">Country:</span>
                              <span className="ml-1 font-medium text-gray-700">{formData.country}</span>
                            </div>
                          )}
                          {formData.state && (
                            <div>
                              <span className="text-gray-500">State:</span>
                              <span className="ml-1 font-medium text-gray-700">{formData.state}</span>
                            </div>
                          )}
                          {formData.city && (
                            <div>
                              <span className="text-gray-500">City:</span>
                              <span className="ml-1 font-medium text-gray-700">{formData.city}</span>
                            </div>
                          )}
                          {formData.district && (
                            <div>
                              <span className="text-gray-500">District:</span>
                              <span className="ml-1 font-medium text-gray-700">{formData.district}</span>
                            </div>
                          )}
                          {formData.pincode && (
                            <div>
                              <span className="text-gray-500">PIN Code:</span>
                              <span className="ml-1 font-medium text-gray-700">{formData.pincode}</span>
                            </div>
                          )}
                          {formData.location_source && (
                            <div>
                              <span className="text-gray-500">Source:</span>
                              <span className="ml-1 font-medium text-indigo-600 capitalize">{formData.location_source}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    country: "",
                                    state: "",
                                    city: "",
                                    district: "",
                                    pincode: "",
                                    latitude: undefined,
                                    longitude: undefined,
                                    location_source: undefined,
                                  }));
                                  toast.success("Location cleared. You can now select manually.");
                                }}
                                className="ml-3 text-xs text-red-600 hover:text-red-800 underline"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Location Selection - Only show if not auto-detected */}
                {!formData.location_source && (
                  <div className="grid grid-cols-1 gap-4 mb-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Location *</label>
                      <span className="text-xs text-gray-500">💡 Use PIN code detection above OR select manually below</span>
                    </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <select
                        value={formData.country}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, country: e.target.value, state: "", city: "", district: "" }));
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
                          setFormData((prev) => ({ ...prev, state: e.target.value, city: "", district: "" }));
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

                    <div>
                      <input
                        type="text"
                        value={formData.district || ""}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, district: e.target.value }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="District (optional)"
                      />
                    </div>
                  </div>
                </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Experience (Years) *</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.min_experience_years}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({ ...prev, min_experience_years: value }));
                        if (formErrors.min_experience_years) setFormErrors(prev => ({ ...prev, min_experience_years: undefined }));
                      }}
                      onBlur={() => handleBlur("min_experience_years")}
                      className={`w-full px-3 py-2 border ${formErrors.min_experience_years ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                      placeholder="e.g. 0"
                    />
                    {formErrors.min_experience_years && <p className="mt-1 text-xs text-red-500">{formErrors.min_experience_years}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Experience (Years) *</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.max_experience_years}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({ ...prev, max_experience_years: value }));
                        if (formErrors.max_experience_years) setFormErrors(prev => ({ ...prev, max_experience_years: undefined }));
                      }}
                      onBlur={() => handleBlur("max_experience_years")}
                      className={`w-full px-3 py-2 border ${formErrors.max_experience_years ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                      placeholder="e.g. 5"
                    />
                    {formErrors.max_experience_years && <p className="mt-1 text-xs text-red-500">{formErrors.max_experience_years}</p>}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
                    <select
                      value={formData.education_level}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, education_level: e.target.value }));
                        if (formErrors.education_level) setFormErrors(prev => ({ ...prev, education_level: undefined }));
                      }}
                      onBlur={() => handleBlur("education_level")}
                      className={`w-full px-3 py-2 border ${formErrors.education_level ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    >
                      {educationLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                    </select>
                    {formErrors.education_level && <p className="mt-1 text-xs text-red-500">{formErrors.education_level}</p>}
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
      ) : jobs && jobs.length > 0 ? (() => {
        const isTeamLeadTab = location.pathname.includes('/team-lead-assignment');
        const isRecruiterTab = location.pathname.includes('/recruiter-assignment');
        const isJobsTab = !isTeamLeadTab && !isRecruiterTab;
        
        const variant = isTeamLeadTab ? "TEAM_LEAD" : isRecruiterTab ? "RECRUITER" : "JOB";

        const filteredJobs = jobs.filter(job => {
          if (isTeamLeadTab) {
            return job.current_recruitment_stage === "Waiting Team Lead Assignment" || job.team_lead_id || job.team_lead_name;
          }
          if (isRecruiterTab) {
            return job.current_recruitment_stage === "Recruiter Assignment" || (job.recruiters_assigned_count && job.recruiters_assigned_count > 0);
          }
          if (location.pathname.includes('/requirement-approval')) {
            return job.current_recruitment_stage === "Requirement Review";
          }
          return true;
        });

        if (filteredJobs.length === 0) {
          let emptyTitle = "No jobs found";
          let emptyDesc = "There are currently no jobs waiting for action in this workflow stage.";
          
          if (isTeamLeadTab) {
            emptyTitle = "No Jobs Waiting for Team Lead Assignment";
            emptyDesc = "All jobs have been assigned team leads.";
          } else if (isRecruiterTab) {
            emptyTitle = "No Jobs Waiting for Recruiter Assignment";
            emptyDesc = "All jobs have been assigned recruiters.";
          } else if (isJobsTab) {
             emptyTitle = "No Jobs Found";
             emptyDesc = "Get started by creating your first job posting.";
          }
          return (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center col-span-full">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{emptyTitle}</h3>
              <p className="mt-1 text-sm text-gray-500">{emptyDesc}</p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job as any}
                variant={variant as any}
                onActionClick={handleActionClick as any}
                onViewDetails={() => setSelectedJobForDetails(job)}
                onViewProgress={() => setSelectedJobForProgress(job)}
                onToggleStatus={(j) => updateJob((j as any).id, { status: (j as any).status === "active" ? "closed" : "active" })}
                onEditJob={(j) => setEditingJob(j as any)}
                onCopyLink={(j) => {
                  navigator.clipboard.writeText(`${window.location.origin}/jobs/${j.id}`);
                  toast.success("Link copied to clipboard");
                }}
              />
            ))}
          </div>
        );
      })() : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first job posting</p>
        </div>
      )}
      {/* Team Lead Assignment Modal */}
      {selectedJobForTeamLead && (
        <AssignTeamLeadModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedJobForTeamLead(null);
          }}
          jobId={selectedJobForTeamLead.id}
          jobTitle={selectedJobForTeamLead.title}
          currentTeamLeadId={selectedJobForTeamLead.team_lead_id}
          onAssign={() => {
            fetchJobs(); // Assuming fetchJobs exists in this component
          }}
        />
      )}

      {/* Recruiter Assignment Modal */}
      {selectedJobForRecruiters && (
        <AssignRecruitersModal
          isOpen={showAssignRecruitersModal}
          onClose={() => {
            setShowAssignRecruitersModal(false);
            setSelectedJobForRecruiters(null);
          }}
          jobId={selectedJobForRecruiters.id}
          jobTitle={selectedJobForRecruiters.title}
          onAssign={() => {
            fetchJobs();
          }}
        />
      )}

      {/* Progressive Disclosure Drawers */}
      <JobProgressDrawer
        isOpen={!!selectedJobForProgress}
        onClose={() => setSelectedJobForProgress(null)}
        job={selectedJobForProgress}
      />
      
      <JobDetailsDrawer
        isOpen={!!selectedJobForDetails}
        onClose={() => setSelectedJobForDetails(null)}
        job={selectedJobForDetails}
      />
    </div>
  );
}
