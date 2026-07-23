/**
 * Role Matcher Service
 *
 * Provides role normalization and matching logic for candidate filtering.
 * Handles seniority tokens, synonyms, and domain-specific role matching.
 */

/**
 * Seniority/level tokens to strip from role titles
 */
const SENIORITY_TOKENS = [
  "senior", "sr", "junior", "jr", "lead", "principal", "staff",
  "associate", "intern", "internship", "trainee", "i", "ii", "iii", "iv",
  "chief", "head of", "vp", "vice president", "director", "manager",
  "executive", "founder", "co-founder", "cto", "ceo", "cfo",
];

/**
 * Domain-specific synonym mappings
 * These only apply when preceded by the same domain word
 */
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  "developer": ["engineer"],
  "engineer": ["developer"],
};

/**
 * Acronym to full form mappings
 */
const ACRONYM_MAPPINGS: Record<string, string> = {
  "sre": "site reliability engineer",
  "swe": "software engineer",
  "ml": "machine learning",
  "ai": "artificial intelligence",
  "devops": "devops",
  "qa": "quality assurance",
  "sdet": "software development engineer in test",
  "ux": "user experience",
  "ui": "user interface",
  "fe": "frontend",
  "be": "backend",
  "fs": "full stack",
  "pm": "product manager",
  "po": "product owner",
};

/**
 * Normalize a role title for comparison
 * - Lowercases and trims
 * - Strips seniority/level tokens
 * - Collapses extra whitespace
 * - Applies synonym mappings
 * - Expands acronyms
 *
 * @param title - The role title to normalize
 * @returns Normalized role string
 */
export function normalizeRole(title: string): string {
  if (!title) return "";

  let normalized = title.toLowerCase().trim();

  // Expand acronyms
  for (const [acronym, fullForm] of Object.entries(ACRONYM_MAPPINGS)) {
    const regex = new RegExp(`\\b${acronym}\\b`, "gi");
    normalized = normalized.replace(regex, fullForm);
  }

  // Strip seniority tokens
  for (const token of SENIORITY_TOKENS) {
    const regex = new RegExp(`\\b${token}\\b`, "gi");
    normalized = normalized.replace(regex, "");
  }

  // Collapse extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Apply domain-specific synonyms
  // Only when preceded by the same domain word
  for (const [domain, synonyms] of Object.entries(DOMAIN_SYNONYMS)) {
    // Check if the role contains the domain word
    const domainRegex = new RegExp(`(\\w+)\\s+${domain}`, "gi");
    const match = normalized.match(domainRegex);

    if (match) {
      const domainWord = match[1];
      // Replace domain + synonym with domain + canonical form
      for (const synonym of synonyms) {
        const synonymRegex = new RegExp(`${domainWord}\\s+${synonym}`, "gi");
        normalized = normalized.replace(synonymRegex, `${domainWord} ${domain}`);
      }
    }
  }

  // Apply general synonyms (domain-independent)
  const generalSynonyms: Record<string, string> = {
    "qa engineer": "quality engineer",
    "quality engineer": "qa engineer",
    "sdet": "software development engineer in test",
    "software development engineer in test": "sdet",
    "machine learning engineer": "ml engineer",
    "ml engineer": "machine learning engineer",
    "site reliability engineer": "sre",
    "sre": "site reliability engineer",
    "software engineer": "swe",
    "swe": "software engineer",
  };

  for (const [synonym, canonical] of Object.entries(generalSynonyms)) {
    normalized = normalized.replace(new RegExp(`\\b${synonym}\\b`, "gi"), canonical);
  }

  return normalized;
}

/**
 * Check if two role titles match
 * - Normalizes both roles
 * - Returns true if they are equal
 * - Returns true if one contains the other as a full-phrase substring (word-boundary aware)
 * - Returns false if only a single generic word matches (e.g., "Engineer" alone won't match "Software Engineer")
 *
 * @param searchRole - The role being searched for
 * @param candidateTitle - The candidate's job title
 * @returns true if the roles match, false otherwise
 */
export function isRoleMatch(searchRole: string, candidateTitle: string): boolean {
  if (!searchRole || !candidateTitle) return false;

  const normalizedSearch = normalizeRole(searchRole);
  const normalizedCandidate = normalizeRole(candidateTitle);

  if (!normalizedSearch || !normalizedCandidate) return false;

  // Exact match
  if (normalizedSearch === normalizedCandidate) {
    return true;
  }

  const searchWords = normalizedSearch.split(" ");
  const candidateWords = normalizedCandidate.split(" ");

  // Single-word roles require exact match (prevent "Engineer" matching "Software Engineer")
  if (searchWords.length === 1 && candidateWords.length === 1) {
    return searchWords[0] === candidateWords[0];
  }

  // For multi-word roles, check if search role is contained in candidate title
  // with word boundary awareness
  if (searchWords.length <= candidateWords.length) {
    // Check if search phrase appears as a contiguous sequence in candidate
    for (let i = 0; i <= candidateWords.length - searchWords.length; i++) {
      let match = true;
      for (let j = 0; j < searchWords.length; j++) {
        if (searchWords[j] !== candidateWords[i + j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }

  // Check if candidate phrase appears in search (reverse direction)
  if (candidateWords.length <= searchWords.length) {
    for (let i = 0; i <= searchWords.length - candidateWords.length; i++) {
      let match = true;
      for (let j = 0; j < candidateWords.length; j++) {
        if (candidateWords[j] !== searchWords[i + j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }

  return false;
}

/**
 * Get role patterns for SQL ILIKE matching
 * Returns an array of pattern strings with wildcards
 *
 * @param role - The role to generate patterns for
 * @returns Array of SQL pattern strings
 */
export function getRolePatterns(role: string): string[] {
  if (!role) return [];

  const normalized = normalizeRole(role);
  const patterns: string[] = [];

  // Exact normalized pattern
  patterns.push(`%${normalized}%`);

  // Add original role pattern
  patterns.push(`%${role.toLowerCase()}%`);

  // Add common variations
  const words = normalized.split(" ");
  if (words.length > 1) {
    // Add patterns with word order variations
    patterns.push(`%${words.join("%")}%`);
  }

  return patterns;
}

/**
 * Extract core role from a title (removes all modifiers)
 * Useful for grouping similar roles together
 *
 * @param title - The role title
 * @returns Core role string
 */
export function extractCoreRole(title: string): string {
  if (!title) return "";

  const normalized = normalizeRole(title);

  // Remove common prefixes/suffixes
  const prefixes = ["software", "senior", "lead", "principal", "junior"];
  const suffixes = ["engineer", "developer", "specialist", "analyst", "manager"];

  let core = normalized;

  for (const prefix of prefixes) {
    core = core.replace(new RegExp(`^${prefix}\\s+`, "gi"), "");
  }

  for (const suffix of suffixes) {
    core = core.replace(new RegExp(`\\s+${suffix}$`, "gi"), "");
  }

  return core.trim();
}