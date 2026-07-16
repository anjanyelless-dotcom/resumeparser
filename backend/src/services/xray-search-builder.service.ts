/**
 * X-Ray Search Query Builder Service
 *
 * Generates X-Ray search queries for multiple platforms:
 * - LinkedIn (site:linkedin.com/in)
 * - GitHub (site:github.com)
 * - Naukri (site:naukri.com)
 * - Wellfound (site:wellfound.com)
 *
 * Also generates combined Google search URLs.
 *
 * This is a pure string-building function - no network calls, no API keys, no external dependencies.
 */

export interface XRayFilters {
  role?: string;
  skills?: string[];
  locations?: string[];
  experience?: string;
  currentCompany?: string[];
}

export interface XRayLinks {
  linkedin: string;
  github: string;
  naukri: string;
  wellfound: string;
  combined: string;
}

/**
 * Generate X-Ray search queries and Google search URLs
 */
export function generateXRayQueries(filters: XRayFilters): { queries: XRayLinks, urls: XRayLinks } {
  const { role, skills, locations, experience, currentCompany } = filters;

  // Try to use role-synonyms.service.ts if it exists
  let rolePart = "";
  if (role) {
    try {
      // Dynamic import to avoid errors if the file doesn't exist
      const roleSynonymsModule = require("./role-synonyms.service");
      const synonyms = roleSynonymsModule.getRoleSynonyms?.(role);
      if (synonyms && synonyms.length > 0) {
        // Build ("Role" OR "Synonym1" OR "Synonym2")
        rolePart = `(${[role, ...synonyms].map(r => `"${r}"`).join(" OR ")})`;
      } else {
        rolePart = `"${role}"`;
      }
    } catch {
      // If role-synonyms.service doesn't exist, just wrap role in quotes
      rolePart = `"${role}"`;
    }
  }

  // Build skills part (OR logic)
  const skillsPart = skills && skills.length > 0
    ? `(${skills.join(" OR ")})`
    : "";

  // Build location part (OR logic if multiple, single string if one)
  const locationPart = locations && locations.length > 0
    ? locations.length === 1
      ? locations[0]
      : `(${locations.join(" OR ")})`
    : "";

  // Build experience part
  const experiencePart = experience ? `"${experience}"` : "";

  // Build company part (OR logic if multiple, single string if one)
  const companyPart = currentCompany && currentCompany.length > 0
    ? currentCompany.length === 1
      ? `"${currentCompany[0]}"`
      : `(${currentCompany.map(c => `"${c}"`).join(" OR ")})`
    : "";

  // Helper to build query string from parts
  const buildQuery = (site: string): string => {
    const parts: string[] = [];

    parts.push(site);

    if (rolePart) parts.push(rolePart);
    if (skillsPart) parts.push(skillsPart);
    if (locationPart) parts.push(locationPart);
    if (experiencePart) parts.push(experiencePart);
    if (companyPart) parts.push(companyPart);

    return parts.join(" ").trim();
  };

  // Build platform-specific queries
  const linkedinQuery = buildQuery("site:linkedin.com/in");
  const githubQuery = buildQuery("site:github.com");
  const naukriQuery = buildQuery("site:naukri.com");
  const wellfoundQuery = buildQuery("site:wellfound.com");

  // Build combined query (OR across all platforms)
  const combinedQuery = buildQuery(
    "(site:linkedin.com/in OR site:github.com OR site:naukri.com OR site:wellfound.com)"
  );

  // Build Google search URLs
  const googleBaseUrl = "https://www.google.com/search?q=";

  const urls: XRayLinks = {
    linkedin: `${googleBaseUrl}${encodeURIComponent(linkedinQuery)}`,
    github: `${googleBaseUrl}${encodeURIComponent(githubQuery)}`,
    naukri: `${googleBaseUrl}${encodeURIComponent(naukriQuery)}`,
    wellfound: `${googleBaseUrl}${encodeURIComponent(wellfoundQuery)}`,
    combined: `${googleBaseUrl}${encodeURIComponent(combinedQuery)}`,
  };

  const queries: XRayLinks = {
    linkedin: linkedinQuery,
    github: githubQuery,
    naukri: naukriQuery,
    wellfound: wellfoundQuery,
    combined: combinedQuery,
  };

  return { queries, urls };
}