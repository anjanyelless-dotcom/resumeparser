import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_PARSED_RESUME } from "../data/mockResume";
import { mapParserDataToApplication } from "../utils/parserMapping";
import { useAuthStore } from "../../../store/useAuthStore";
import { ensureCandidateExists, saveApplicationProgress } from "../../../services/api/applications";
import type {
  ApplicationData,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  WizardStep,
  WizardStepId,
} from "../types/application";

const DRAFT_KEY = "applicant-portal-draft-v1";

export const WIZARD_STEPS: WizardStep[] = [
  { id: "account", label: "Create Account/Sign In" },
  { id: "resume", label: "Autofill with Resume" },
  { id: "information", label: "My Information" },
  { id: "experience", label: "My Experience" },
  { id: "questions", label: "Application Questions" },
  { id: "disclosures", label: "Voluntary Disclosures" },
  { id: "review", label: "Review & Submit" },
];

const emptyExperience = (): ExperienceItem => ({
  id: crypto.randomUUID(),
  jobTitle: "",
  company: "",
  employmentType: "",
  location: "",
  country: "",
  state: "",
  city: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  duration: "",
  currentlyWorking: false,
  roleDescription: "",
  technologiesUsed: "",
  skillsUsed: "",
});

const emptyEducation = (): EducationItem => ({
  id: crypto.randomUUID(),
  degree: "",
  institution: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  cgpa: "",
  percentage: "",
  description: "",
});

const emptyProject = (): ProjectItem => ({
  id: crypto.randomUUID(),
  projectName: "",
  client: "",
  role: "",
  duration: "",
  technologies: "",
  description: "",
  projectUrl: "",
});

const emptyCertification = (): CertificationItem => ({
  id: crypto.randomUUID(),
  certificationName: "",
  organization: "",
  issueDate: "",
  expiryDate: "",
  credentialId: "",
  credentialUrl: "",
});

const emptyLanguage = (): LanguageItem => ({
  id: crypto.randomUUID(),
  language: "",
  proficiency: "",
});

export const DEFAULT_APPLICATION_DATA: ApplicationData = {
  account: {
    email: "",
    password: "",
    confirmPassword: "",
    agreedToTerms: false,
  },
  resume: {
    fileName: "",
    fileSizeKb: 0,
    uploadStatus: "idle",
  },
  personalInfo: {
    firstName: "",
    lastName: "",
    middleName: "",
    preferredName: "",
    alternatePhone: "",
    email: "",
    phone: "",
    countryCode: "+1",
    mobile: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    linkedIn: "",
    portfolio: "",
    website: "",
    github: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    maritalStatus: "",
    workAuthorization: "",
    visaStatus: "",
    currentLocation: "",
  },
  experiences: [emptyExperience()],
  education: [emptyEducation()],
  skills: [],
  certifications: [emptyCertification()],
  projects: [emptyProject()],
  languages: [emptyLanguage()],
  questions: {
    hearAboutUs: "",
    expectedSalary: "",
    currentSalary: "",
    noticePeriod: "",
    willingToRelocate: "",
    willingToTravel: "",
    requiresSponsorship: "",
    yearsOfExperience: "",
    currentEmployer: "",
    reasonForJobChange: "",
  },
  disclosures: {
    acceptedPrivacyNotice: false,
    agreedToTerms: false,
    gender: "",
    veteranStatus: "",
    disabilityStatus: "",
    ethnicity: "",
  },
};

interface ApplicationContextValue {
  application: ApplicationData;
  currentStep: WizardStepId;
  highestCompletedStepIndex: number;
  setCurrentStep: (step: WizardStepId) => void;
  saveSection: <K extends keyof ApplicationData>(
    section: K,
    value: ApplicationData[K],
  ) => void;
  markResumeParsingComplete: (fileName: string, fileSizeKb: number, parsedData?: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  saveDraft: () => void;
  loadDraft: () => void;
  clearDraft: () => void;
  resetApplication: () => void;
  setApplicationWithoutAutoSave: (data: ApplicationData) => void;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

const mergeWithParsedResume = (source: ApplicationData, parsedData?: any): ApplicationData => {
  // Use real parser data if provided, otherwise fall back to mock data
  const parsed = parsedData ? mapParserDataToApplication(parsedData) : MOCK_PARSED_RESUME;

  return {
    ...source,
    resume: {
      ...source.resume,
      uploadStatus: "parsed",
    },
    personalInfo: {
      ...source.personalInfo,
      ...parsed.personalInfo,
    },
    experiences:
      parsed.experiences && parsed.experiences.length > 0
        ? parsed.experiences
        : source.experiences,
    education:
      parsed.education && parsed.education.length > 0
        ? parsed.education
        : source.education,
    skills: parsed.skills ?? source.skills,
    certifications: parsed.certifications ?? source.certifications,
    projects:
      parsed.projects && parsed.projects.length > 0
        ? parsed.projects
        : source.projects,
    languages: parsed.languages ?? source.languages,
  };
};

export function ApplicationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [application, setApplication] = useState<ApplicationData>(DEFAULT_APPLICATION_DATA);
  const [currentStep, setCurrentStepState] = useState<WizardStepId>("account");
  const [highestCompletedStepIndex, setHighestCompletedStepIndex] = useState(0);

  const setCurrentStep = useCallback((step: WizardStepId) => {
    const targetIndex = WIZARD_STEPS.findIndex((item) => item.id === step);
    if (targetIndex <= highestCompletedStepIndex + 1) {
      setCurrentStepState(step);
    }
  }, [highestCompletedStepIndex]);

  const saveSection = useCallback(<K extends keyof ApplicationData>(
    section: K,
    value: ApplicationData[K],
    skipAutoSave = false,
  ) => {
    // Get auth state before updating application state
    const { user, isAuthenticated } = useAuthStore.getState();
    
    setApplication((prev) => {
      const updated = { ...prev, [section]: value };
      
      // Auto-save to backend if user is authenticated and not skipping
      if (isAuthenticated && user && !skipAutoSave) {
        // Ensure candidate exists and get candidate ID
        ensureCandidateExists({
          email: user.email,
          full_name: user.name || user.email.split('@')[0],
          phone: ''
        }).then(candidateId => {
          return saveApplicationProgress(candidateId, updated);
        }).catch((error) => {
          console.warn("Failed to auto-save application progress:", error);
        });
      }
      
      return updated;
    });
  }, []);

  const markResumeParsingComplete = useCallback((fileName: string, fileSizeKb: number, parsedData?: any) => {
    setApplication((prev) => {
      const merged = mergeWithParsedResume({
        ...prev,
        resume: {
          fileName,
          fileSizeKb,
          uploadStatus: "parsed",
        },
      }, parsedData);

      // Auto-save progress to backend
      const { user, isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated && user) {
        ensureCandidateExists({
          email: user.email,
          full_name: user.name || user.email.split('@')[0],
          phone: ''
        }).then(candidateId => {
          return saveApplicationProgress(candidateId, merged);
        }).catch((error) => {
          console.warn("Failed to auto-save application progress after resume parse:", error);
        });
      }

      return merged;
    });
  }, []);

  const nextStep = useCallback(() => {
    const index = WIZARD_STEPS.findIndex((step) => step.id === currentStep);
    const nextIndex = Math.min(index + 1, WIZARD_STEPS.length - 1);
    setCurrentStepState(WIZARD_STEPS[nextIndex].id);
    setHighestCompletedStepIndex((prev) => Math.max(prev, nextIndex));
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const index = WIZARD_STEPS.findIndex((step) => step.id === currentStep);
    const prevIndex = Math.max(index - 1, 0);
    setCurrentStepState(WIZARD_STEPS[prevIndex].id);
  }, [currentStep]);

  const saveDraft = useCallback(() => {
    const payload = JSON.stringify({ application, currentStep, highestCompletedStepIndex });
    localStorage.setItem(DRAFT_KEY, payload);
  }, [application, currentStep, highestCompletedStepIndex]);

  const loadDraft = useCallback(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as {
      application: ApplicationData;
      currentStep: WizardStepId;
      highestCompletedStepIndex: number;
    };

    setApplication(parsed.application);
    setCurrentStepState(parsed.currentStep);
    setHighestCompletedStepIndex(parsed.highestCompletedStepIndex);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const resetApplication = useCallback(() => {
    setApplication(DEFAULT_APPLICATION_DATA);
    setCurrentStepState("account");
    setHighestCompletedStepIndex(0);
    clearDraft();
  }, [clearDraft]);

  const setApplicationWithoutAutoSave = useCallback((data: ApplicationData) => {
    setApplication(data);
  }, []);

  const value = useMemo<ApplicationContextValue>(
    () => ({
      application,
      currentStep,
      highestCompletedStepIndex,
      setCurrentStep,
      saveSection,
      markResumeParsingComplete,
      nextStep,
      prevStep,
      saveDraft,
      loadDraft,
      clearDraft,
      resetApplication,
      setApplicationWithoutAutoSave,
    }),
    [
      application,
      currentStep,
      highestCompletedStepIndex,
      setCurrentStep,
      saveSection,
      markResumeParsingComplete,
      nextStep,
      prevStep,
      saveDraft,
      loadDraft,
      clearDraft,
      resetApplication,
      setApplicationWithoutAutoSave,
    ],
  );

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplicationContext() {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error("useApplicationContext must be used inside ApplicationProvider");
  }
  return context;
}