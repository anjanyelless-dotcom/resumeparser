/**
 * Virtual JD Builder Service
 *
 * Builds a virtual Job Description from filter criteria for candidate matching.
 * This allows recruiters to search candidates using structured filters instead of
 * pasting a complete JD, while still leveraging the existing ATS Engine for scoring.
 */

import { extractJD, ExtractedJD } from "./jd-extractor.service";
import { getSkillsForRole } from "./role-skill-mapping.service";

/**
 * Filter criteria for candidate search
 */
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
}

/**
 * Builds a virtual JD from filter criteria
 * 
 * Process:
 * 1. Construct a JD-style text block from the filters
 * 2. Use the existing JD Extractor to normalize and extract structured data
 * 3. Override extracted values with exact filter values to preserve intent
 * 
 * @param filters - The filter criteria from the search form
 * @returns ExtractedJD object compatible with ATS Engine
 */
export function buildVirtualJDFromFilters(filters: FilterCriteria): ExtractedJD {
  // Step 1: Build JD-style text block from filters
  const jdText = buildJDTextFromFilters(filters);

  // Step 2: Use existing JD Extractor to normalize and extract
  const extractedJD = extractJD(jdText);

  // Step 3: Override with exact filter values to preserve intent
  // This ensures that if a recruiter selects "React.js" as a required skill,
  // it won't get normalized to "React" and lose the exact match requirement
  if (filters.skills && filters.skills.length > 0) {
    extractedJD.skills = filters.skills;
  } else if (filters.role) {
    // ✅ FIX: If skills not provided, infer from role using role-skill mapping
    extractedJD.skills = getSkillsForRole(filters.role);
  }

  if (filters.minExperience !== undefined) {
    extractedJD.experienceYears = filters.minExperience;
    extractedJD.experienceMin = filters.minExperience;
  }

  if (filters.maxExperience !== undefined) {
    extractedJD.experienceMax = filters.maxExperience;
  }

  if (filters.role) {
    extractedJD.roleKeywords = [filters.role];
  }

  if (filters.education && filters.education.length > 0) {
    extractedJD.educationKeywords = filters.education;
  }

  return extractedJD;
}

/**
 * Builds a JD-style text block from filter criteria
 * 
 * @param filters - The filter criteria
 * @returns Formatted JD text string
 */
function buildJDTextFromFilters(filters: FilterCriteria): string {
  const parts: string[] = [];
  
  // Role/Title
  if (filters.role) {
    parts.push(`Role: ${filters.role}`);
  }
  
  // Required Skills
  if (filters.skills && filters.skills.length > 0) {
    parts.push(`Required Skills: ${filters.skills.join(', ')}`);
  }
  
  // Experience
  if (filters.minExperience !== undefined || filters.maxExperience !== undefined) {
    const expParts: string[] = [];
    if (filters.minExperience !== undefined) {
      expParts.push(`${filters.minExperience}+ years`);
    }
    if (filters.maxExperience !== undefined) {
      expParts.push(`up to ${filters.maxExperience} years`);
    }
    parts.push(`Experience: ${expParts.join(' to ')}`);
  }
  
  // Location
  if (filters.locations && filters.locations.length > 0) {
    parts.push(`Location: ${filters.locations.join(', ')}`);
  }
  
  // Education
  if (filters.education && filters.education.length > 0) {
    parts.push(`Education: ${filters.education.join(', ')}`);
  }
  
  // Current Company
  if (filters.currentCompany && filters.currentCompany.length > 0) {
    parts.push(`Current Company: ${filters.currentCompany.join(', ')}`);
  }
  
  // Employment Type
  if (filters.employmentType && filters.employmentType.length > 0) {
    parts.push(`Employment Type: ${filters.employmentType.join(', ')}`);
  }
  
  // Notice Period
  if (filters.noticePeriod && filters.noticePeriod.length > 0) {
    parts.push(`Notice Period: ${filters.noticePeriod.join(', ')}`);
  }
  
  // Join all parts with newlines
  return parts.join('\n');
}
