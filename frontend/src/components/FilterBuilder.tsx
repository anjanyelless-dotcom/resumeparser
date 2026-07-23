import { useState, useEffect } from "react";
import { api } from "../services/api";
import { X, ChevronDown } from "lucide-react";
import SkillsAutocomplete from "./common/SkillsAutocomplete";
import RolesAutocomplete from "./common/RolesAutocomplete";

export interface FilterCriteria {
  role?: string;
  skills?: string[];
  minExperience?: number;
  maxExperience?: number;
  locations?: string[];
  education?: string[];
  noticePeriod?: string[];
  currentCompany?: string[];
  employmentType?: string[];
  manualLocation?: string;
  manualCompany?: string;
  manualEducation?: string;
}

interface FilterOptions {
  roles: string[];
  skills: { name: string; category: string }[];
  locations: string[];
  education: string[];
  noticePeriod: string[];
  employmentType: string[];
  companies: string[];
}

interface FilterBuilderProps {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
}

export default function FilterBuilder({ filters, onChange }: FilterBuilderProps) {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    role: true,
    skills: true,
    experience: true,
    location: false,
    education: false,
    noticePeriod: false,
    company: false,
    employmentType: false,
  });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/candidates/filter-options");
      setOptions(response.data);
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
      // Set default options so UI still works
      setOptions({
        roles: ["Software Engineer", "Senior Developer", "Full Stack Developer", "Frontend Developer", "Backend Developer"],
        skills: [],
        locations: ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Pune", "Delhi"],
        education: ["B.Tech", "M.Tech", "B.Sc", "M.Sc", "B.Com", "M.Com"],
        noticePeriod: ["immediately", "15_days", "30_days", "45_days", "60_days", "90_days"],
        employmentType: ["full_time", "part_time", "contract", "internship"],
        companies: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = (key: keyof FilterCriteria, value: any) => {
    onChange({
      ...filters,
      [key]: value
    });
  };

  const toggleArrayItem = (key: keyof FilterCriteria, item: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    onChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof FilterCriteria];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== "";
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      </div>
    );
  }

  // Combine backend options with manually added filters so they show up as checkboxes
  const displayLocations = Array.from(new Set([...(options?.locations || []), ...(filters.locations || [])]));
  const displayEducation = Array.from(new Set([...(options?.education || []), ...(filters.education || [])]));
  const displayCompanies = Array.from(new Set([...(options?.companies || []), ...(filters.currentCompany || [])]));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Search Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Role */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("role")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Role</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.role ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.role && (
          <div className="border-t border-slate-200 p-4">
            <RolesAutocomplete
              selectedRole={filters.role}
              onRoleChange={(role) => updateFilter("role", role)}
              placeholder="Search or select role..."
              allowCustom={true}
            />
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("skills")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Skills</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.skills ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.skills && (
          <div className="border-t border-slate-200 p-4">
            <SkillsAutocomplete
              selectedSkills={filters.skills || []}
              onSkillsChange={(skills) => updateFilter("skills", skills)}
              placeholder="Search skills..."
              allowCustom={true}
            />
          </div>
        )}
      </div>

      {/* Experience */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("experience")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Experience (Years)</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.experience ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.experience && (
          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Min</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={filters.minExperience || ""}
                  onChange={(e) => updateFilter("minExperience", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Max</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={filters.maxExperience || ""}
                  onChange={(e) => updateFilter("maxExperience", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="30"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("location")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Location</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.location ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.location && (
          <div className="border-t border-slate-200 p-4">
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {displayLocations.length > 0 ? (
                displayLocations.map((location) => (
                  <label
                    key={location}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={filters.locations?.includes(location) || false}
                      onChange={() => toggleArrayItem("locations", location)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span>{location}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No locations available from database</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Add Location Manually
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filters.manualLocation || ""}
                  onChange={(e) => updateFilter("manualLocation", e.target.value)}
                  placeholder="e.g., Hyderabad, Bangalore"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <button
                  onClick={() => {
                    const val = filters.manualLocation?.trim();
                    if (val) {
                      const currentArray = (filters.locations as string[]) || [];
                      const newArray = currentArray.includes(val)
                        ? currentArray.filter(i => i !== val)
                        : [...currentArray, val];
                      onChange({
                        ...filters,
                        locations: newArray,
                        manualLocation: ""
                      });
                    }
                  }}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Education */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("education")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Education</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.education ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.education && (
          <div className="border-t border-slate-200 p-4">
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {displayEducation.length > 0 ? (
                displayEducation.map((edu) => (
                  <label
                    key={edu}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={filters.education?.includes(edu) || false}
                      onChange={() => toggleArrayItem("education", edu)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span>{edu}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No education options available from database</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Add Education Manually
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filters.manualEducation || ""}
                  onChange={(e) => updateFilter("manualEducation", e.target.value)}
                  placeholder="e.g., Ph.D, B.A"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <button
                  onClick={() => {
                    const val = filters.manualEducation?.trim();
                    if (val) {
                      const currentArray = (filters.education as string[]) || [];
                      const newArray = currentArray.includes(val)
                        ? currentArray.filter(i => i !== val)
                        : [...currentArray, val];
                      onChange({
                        ...filters,
                        education: newArray,
                        manualEducation: ""
                      });
                    }
                  }}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notice Period */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("noticePeriod")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Notice Period</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.noticePeriod ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.noticePeriod && (
          <div className="border-t border-slate-200 p-4">
            <div className="space-y-2">
              {options?.noticePeriod && options.noticePeriod.length > 0 ? (
                options.noticePeriod.map((period) => (
                  <label
                    key={period}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={filters.noticePeriod?.includes(period) || false}
                      onChange={() => toggleArrayItem("noticePeriod", period)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="capitalize">{period.replace("_", " ")}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No notice period options available from database</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Current Company */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("company")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Current Company</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.company ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.company && (
          <div className="border-t border-slate-200 p-4">
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {displayCompanies.length > 0 ? (
                displayCompanies.map((company) => (
                <label
                  key={company}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={filters.currentCompany?.includes(company) || false}
                    onChange={() => toggleArrayItem("currentCompany", company)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span>{company}</span>
                </label>
              ))
              ) : (
                <p className="text-sm text-slate-500 italic">No companies available from database</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Add Company Manually
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filters.manualCompany || ""}
                  onChange={(e) => updateFilter("manualCompany", e.target.value)}
                  placeholder="e.g., Google, Microsoft"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <button
                  onClick={() => {
                    const val = filters.manualCompany?.trim();
                    if (val) {
                      const currentArray = (filters.currentCompany as string[]) || [];
                      const newArray = currentArray.includes(val)
                        ? currentArray.filter(i => i !== val)
                        : [...currentArray, val];
                      onChange({
                        ...filters,
                        currentCompany: newArray,
                        manualCompany: ""
                      });
                    }
                  }}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employment Type */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => toggleSection("employmentType")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-slate-900">Employment Type</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform ${
              expandedSections.employmentType ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.employmentType && (
          <div className="border-t border-slate-200 p-4">
            <div className="space-y-2">
              {options?.employmentType && options.employmentType.length > 0 ? (
                options.employmentType.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={filters.employmentType?.includes(type) || false}
                      onChange={() => toggleArrayItem("employmentType", type)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="capitalize">{type.replace("_", " ")}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No employment type options available from database</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
