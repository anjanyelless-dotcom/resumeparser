import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

export interface Company {
  id: string;
  name: string;
  website: string;
  career_url?: string;
  linkedin_url?: string;
  industry?: string;
  company_size?: string;
  hiring_status?: string;
  hiring_score?: number;
  last_scraped_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface CompanyContact {
  id: string;
  contact_type: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface CompanyJob {
  id: string;
  title: string;
  location?: string;
  experience_level?: string;
  job_url?: string;
  posted_date?: string;
  last_seen_at?: string;
}

export interface ScrapeJob {
  id: string;
  status: string;
  level_reached: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface HiringScoreBreakdown {
  careerPageExists?: number;
  hrEmailExists?: number;
  openJobsScore?: number;
  linkedinExists?: number;
  recentJobsScore?: number;
}

interface CompanyIntelState {
  companies: Company[];
  currentCompany: Company | null;
  contacts: CompanyContact[];
  jobs: CompanyJob[];
  scrapeJob: ScrapeJob | null;
  hiringScoreBreakdown: HiringScoreBreakdown | null;
  isLoading: boolean;
  isScanning: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

interface CompanyIntelActions {
  scanCompany: (website: string) => Promise<{ companyId: string; jobId: string; status: string }>;
  pollScanStatus: (companyId: string) => void;
  fetchCompany: (companyId: string) => Promise<void>;
  fetchCompanies: (params?: { page?: number; limit?: number; search?: string; industry?: string; minScore?: number; hiringStatus?: string }) => Promise<void>;
  rescanCompany: (companyId: string) => Promise<{ jobId: string; status: string }>;
  setCurrentCompany: (company: Company | null) => void;
  clearError: () => void;
}

export const useCompanyIntelStore = create<CompanyIntelState & CompanyIntelActions>((set, get) => ({
  // Initial state
  companies: [],
  currentCompany: null,
  contacts: [],
  jobs: [],
  scrapeJob: null,
  hiringScoreBreakdown: null,
  isLoading: false,
  isScanning: false,
  error: null,
  pagination: null,

  // Actions
  scanCompany: async (website: string) => {
    set({ isScanning: true, error: null });
    try {
      const response = await api.post('/companies/scan', { website });
      const { companyId, jobId, status } = response.data;
      
      // Start polling for scan status
      get().pollScanStatus(companyId);
      
      return { companyId, jobId, status };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to start company scan";
      set({ error: errorMessage, isScanning: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  pollScanStatus: async (companyId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/companies/${companyId}/scan-status`);
        const scrapeJob = response.data;
        
        set({ scrapeJob });
        
        // Stop polling if status is success, partial, or failed
        if (['success', 'partial', 'failed'].includes(scrapeJob.status)) {
          clearInterval(pollInterval);
          set({ isScanning: false });
          
          // Fetch full company data
          await get().fetchCompany(companyId);
          
          if (scrapeJob.status === 'success') {
            toast.success('Company scan completed successfully');
          } else if (scrapeJob.status === 'partial') {
            toast.error('Company scan completed with some errors');
          } else {
            toast.error('Company scan failed');
          }
        }
      } catch (error: any) {
        clearInterval(pollInterval);
        set({ isScanning: false, error: error.response?.data?.error || "Failed to check scan status" });
        toast.error(error.response?.data?.error || "Failed to check scan status");
      }
    }, 3000); // Poll every 3 seconds
  }, 

  fetchCompany: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/companies/${companyId}`);
      const { company, contacts, jobs, scrapeJob, hiringScoreBreakdown } = response.data;
      
      set({ 
        currentCompany: company,
        contacts,
        jobs,
        scrapeJob,
        hiringScoreBreakdown,
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to fetch company";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  fetchCompanies: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.industry) queryParams.append('industry', params.industry);
      if (params.minScore) queryParams.append('minScore', params.minScore.toString());
      if (params.hiringStatus) queryParams.append('hiringStatus', params.hiringStatus);

      const response = await api.get(`/companies?${queryParams.toString()}`);
      set({ 
        companies: response.data.data || [],
        pagination: response.data.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to fetch companies";
      set({ error: errorMessage, isLoading: false, companies: [] });
      toast.error(errorMessage);
    }
  },

  rescanCompany: async (companyId: string) => {
    set({ isScanning: true, error: null });
    try {
      const response = await api.post(`/companies/${companyId}/rescan`);
      const { jobId, status } = response.data;
      
      // Start polling for scan status
      get().pollScanStatus(companyId);
      
      toast.success('Rescan initiated');
      return { jobId, status };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to rescan company";
      set({ error: errorMessage, isScanning: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  setCurrentCompany: (company) => {
    set({ currentCompany: company });
  },

  clearError: () => {
    set({ error: null });
  },
}));
