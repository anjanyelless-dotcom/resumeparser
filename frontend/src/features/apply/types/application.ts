export type WizardStepId = 
  | "account"
  | "resume" 
  | "information"
  | "experience"
  | "questions"
  | "disclosures"
  | "review";

export interface WizardStep {
  id: WizardStepId;
  label: string;
}

export interface AccountData {
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}

export interface ResumeData {
  fileName: string;
  fileSizeKb: number;
  uploadStatus: "idle" | "uploading" | "uploaded" | "parsing" | "parsed" | "error";
  candidateId?: string;
  jobId?: string;
  parsingJobId?: string;
}

export interface PersonalInfoData {
  firstName: string;
  lastName: string;
  middleName: string;
  preferredName: string;
  alternatePhone: string;
  email: string;
  phone: string;
  countryCode: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  linkedIn: string;
  portfolio: string;
  website: string;
  github: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  maritalStatus: string;
  workAuthorization: string;
  visaStatus: string;
  currentLocation: string;
}

export interface ExperienceItem {
  id: string;
  jobTitle: string;
  company: string;
  employmentType: string;
  location: string;
  country: string;
  state: string;
  city: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  duration: string;
  currentlyWorking: boolean;
  roleDescription: string;
  technologiesUsed: string;
  skillsUsed: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  cgpa: string;
  percentage: string;
  description: string;
}

export interface CertificationItem {
  id: string;
  certificationName: string;
  organization: string;
  issueDate: string;
  expiryDate: string;
  credentialId: string;
  credentialUrl: string;
}

export interface ProjectItem {
  id: string;
  projectName: string;
  client: string;
  role: string;
  duration: string;
  technologies: string;
  description: string;
  projectUrl: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: string;
}

export interface QuestionsData {
  hearAboutUs: string;
  expectedSalary: string;
  currentSalary: string;
  noticePeriod: string;
  willingToRelocate: string;
  willingToTravel: string;
  requiresSponsorship: string;
  yearsOfExperience: string;
  currentEmployer: string;
  reasonForJobChange: string;
}

export interface DisclosuresData {
  acceptedPrivacyNotice: boolean;
  agreedToTerms: boolean;
  gender: string;
  veteranStatus: string;
  disabilityStatus: string;
  ethnicity: string;
}

export interface ApplicationData {
  account: AccountData;
  resume: ResumeData;
  personalInfo: PersonalInfoData;
  experiences: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  languages: LanguageItem[];
  questions: QuestionsData;
  disclosures: DisclosuresData;
}
