import type { ApplicationData } from "../types/application";

interface ParsedResumeData {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    website?: string;
    location?: string;
  };
  work_experience?: Array<{
    job_title?: string;
    company?: string;
    company_name?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    location?: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    gpa?: number;
  }>;
  skills?: string[];
  certifications?: Array<{
    name?: string;
    issuing_organization?: string;
    issue_date?: string;
    expiry_date?: string;
    credential_id?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    role?: string;
    duration?: string;
  }>;
  summary?: string;
}

export const mapParserDataToApplication = (parsedData: ParsedResumeData): Partial<ApplicationData> => {
  const result: Partial<ApplicationData> = {};

  // Map Personal Information
  if (parsedData.contact) {
    const nameParts = parsedData.contact.name?.split(' ') || [];
    result.personalInfo = {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      middleName: '',
      preferredName: nameParts[0] || '',
      alternatePhone: '',
      email: parsedData.contact.email || '',
      phone: parsedData.contact.phone || '',
      countryCode: '',
      mobile: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      linkedIn: parsedData.contact.linkedin || '',
      portfolio: parsedData.contact.portfolio || parsedData.contact.website || '',
      website: parsedData.contact.website || '',
      github: parsedData.contact.github || '',
      dateOfBirth: '',
      gender: '',
      nationality: '',
      maritalStatus: '',
      workAuthorization: '',
      visaStatus: '',
      currentLocation: '',
    };
  }

  // Map Work Experience
  if (parsedData.work_experience?.length) {
    result.experiences = parsedData.work_experience.map((exp, index) => ({
      id: `exp-${index + 1}`,
      jobTitle: exp.job_title || '',
      company: exp.company || exp.company_name || '',
      employmentType: 'Full Time',
      location: exp.location || '',
      country: '',
      state: '',
      city: '',
      startMonth: exp.start_date ? new Date(exp.start_date).toLocaleString('default', { month: 'short' }) : '',
      startYear: exp.start_date ? new Date(exp.start_date).getFullYear().toString() : '',
      endMonth: exp.end_date ? new Date(exp.end_date).toLocaleString('default', { month: 'short' }) : '',
      endYear: exp.end_date ? new Date(exp.end_date).getFullYear().toString() : '',
      duration: '',
      currentlyWorking: exp.is_current || false,
      roleDescription: exp.description || '',
      technologiesUsed: '',
      skillsUsed: '',
    }));
  }

  // Map Education
  if (parsedData.education?.length) {
    result.education = parsedData.education.map((edu, index) => ({
      id: `edu-${index + 1}`,
      degree: edu.degree || '',
      institution: edu.institution || '',
      fieldOfStudy: edu.field_of_study || '',
      startYear: edu.start_date ? new Date(edu.start_date).getFullYear().toString() : '',
      endYear: edu.end_date ? new Date(edu.end_date).getFullYear().toString() : '',
      cgpa: edu.gpa?.toString() || '',
      percentage: '',
      description: '',
    }));
  }

  // Map Skills
  if (parsedData.skills?.length) {
    result.skills = parsedData.skills;
  }

  // Map Certifications
  if (parsedData.certifications?.length) {
    result.certifications = parsedData.certifications.map((cert, index) => ({
      id: `cert-${index + 1}`,
      certificationName: cert.name || '',
      organization: cert.issuing_organization || '',
      issueDate: cert.issue_date || '',
      expiryDate: cert.expiry_date || '',
      credentialId: cert.credential_id || '',
      credentialUrl: '',
    }));
  }

  // Map Projects
  if (parsedData.projects?.length) {
    result.projects = parsedData.projects.map((project, index) => ({
      id: `proj-${index + 1}`,
      projectName: project.name || '',
      client: '',
      role: project.role || '',
      duration: project.duration || '',
      technologies: project.technologies?.join(', ') || '',
      description: project.description || '',
      projectUrl: '',
    }));
  }

  // Map Summary to additional info
  if (parsedData.summary) {
    result.questions = {
      hearAboutUs: '',
      expectedSalary: '',
      currentSalary: '',
      noticePeriod: '',
      willingToRelocate: '',
      willingToTravel: '',
      requiresSponsorship: '',
      yearsOfExperience: '',
      currentEmployer: '',
      reasonForJobChange: parsedData.summary,
    };
  }

  return result;
};

export const extractNameParts = (fullName?: string): { firstName: string; lastName: string } => {
  if (!fullName) return { firstName: '', lastName: '' };
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

export const parseDate = (dateString?: string): { month: string; year: string } => {
  if (!dateString) return { month: '', year: '' };
  
  try {
    const date = new Date(dateString);
    return {
      month: date.toLocaleString('default', { month: 'short' }),
      year: date.getFullYear().toString()
    };
  } catch {
    return { month: '', year: '' };
  }
};
