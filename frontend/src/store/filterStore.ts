import { create } from "zustand";

type FilterState = {
  searchTerm: string;
  skills: string[];
  location: string;
  minExperience: number | null;
  maxExperience: number | null;
  company: string;
  jobTitle: string;
  certification: string;
  salaryMin: number | null;
  salaryMax: number | null;
  setSearchTerm: (value: string) => void;
  setSkills: (skills: string[]) => void;
  setLocation: (value: string) => void;
  setExperience: (min: number | null, max: number | null) => void;
  setCompany: (value: string) => void;
  setJobTitle: (value: string) => void;
  setCertification: (value: string) => void;
  setSalaryRange: (min: number | null, max: number | null) => void;
  resetFilters: () => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  searchTerm: "",
  skills: [],
  location: "",
  minExperience: null,
  maxExperience: null,
  company: "",
  jobTitle: "",
  certification: "",
  salaryMin: null,
  salaryMax: null,
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSkills: (skills) => set({ skills }),
  setLocation: (location) => set({ location }),
  setExperience: (minExperience, maxExperience) =>
    set({ minExperience, maxExperience }),
  setCompany: (company) => set({ company }),
  setJobTitle: (jobTitle) => set({ jobTitle }),
  setCertification: (certification) => set({ certification }),
  setSalaryRange: (salaryMin, salaryMax) =>
    set({ salaryMin, salaryMax }),
  resetFilters: () =>
    set({
      searchTerm: "",
      skills: [],
      location: "",
      minExperience: null,
      maxExperience: null,
      company: "",
      jobTitle: "",
      certification: "",
      salaryMin: null,
      salaryMax: null,
    }),
}));
