import { apiClient } from "./client";

export interface ApplicationSubmission {
  candidateId: string;
  jobId: string;
  resumeId?: string;
  personalInfo: any;
  experiences: any[];
  education: any[];
  skills: string[];
  certifications: any[];
  projects: any[];
  questions: any;
  disclosures: any;
}

export const submitApplication = async (applicationData: ApplicationSubmission) => {
  const response = await apiClient.post("/submissions", applicationData);
  return response.data;
};

export const updateCandidateProfile = async (candidateId: string, profileData: any) => {
  const response = await apiClient.put(`/candidates/${candidateId}`, profileData);
  return response.data;
};

export const createCandidateFromApplication = async (candidateData: any) => {
  const response = await apiClient.post("/candidates", candidateData);
  // Backend returns { success: true, candidate: {...} }
  return response.data?.candidate || response.data;
};

/**
 * Get candidate record for the current user
 */
export const getCandidateForUser = async (email: string) => {
  const response = await apiClient.get(`/candidates?search=${email}&limit=1`);
  const candidates = response.data.candidates || [];
  return candidates.length > 0 ? candidates[0] : null;
};

/**
 * Ensure candidate exists for user and return candidate ID
 */
export const ensureCandidateExists = async (userData: {
  email: string;
  full_name?: string;
  phone?: string;
}): Promise<string> => {
  try {
    // First try to find existing candidate
    const existingCandidate = await getCandidateForUser(userData.email);
    if (existingCandidate) {
      console.log('Found existing candidate:', existingCandidate.id);
      return existingCandidate.id;
    }

    // Create new candidate if none exists
    console.log('Creating new candidate for user:', userData.email);
    const newCandidate = await createCandidateFromApplication({
      email: userData.email,
      full_name: userData.full_name || userData.email.split('@')[0],
      phone: userData.phone || '',
      status: 'pending'
    });
    console.log('Created new candidate:', newCandidate.id);
    return newCandidate.id;
  } catch (error) {
    console.error('Error ensuring candidate exists:', error);
    throw error;
  }
};

/**
 * Save application progress for a candidate
 */
export const saveApplicationProgress = async (candidateId: string, applicationData: any) => {
  const response = await apiClient.post(`/candidates/${candidateId}/application-progress`, {
    application_data: applicationData,
    last_updated: new Date().toISOString()
  });
  return response.data;
};

/**
 * Load application progress for a candidate
 */
export const loadApplicationProgress = async (candidateId: string): Promise<any | null> => {
  try {
    const response = await apiClient.get(`/candidates/${candidateId}/application-progress`);
    return response.data.application_data || null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
