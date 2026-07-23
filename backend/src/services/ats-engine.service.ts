/**
 * ATS Engine Service
 *
 * Scores each candidate against an extracted JD using 6 weighted dimensions:
 *   Skill Match       50%
 *   Experience        20%
 *   Role Match        10%
 *   Project Match     10%
 *   Education          5%
 *   Certification      5%
 *
 * NO external AI APIs — pure TypeScript string matching with synonym awareness.
 */

import { ExtractedJD } from "./jd-extractor.service";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  raw_resume_text?: string;
  years_of_experience?: number;
  skills: string[];              // from skills table
  work_history: WorkEntry[];
  education: EducationEntry[];
  certifications: string[];
  projects?: any[];              // JSONB array stored on candidates table
  parsed_data?: any;             // from parsing_jobs.parsed_data JSONB
}

export interface WorkEntry {
  job_title?: string;
  company_name?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
}

export interface EducationEntry {
  degree?: string;
  institution?: string;
  field_of_study?: string;
}

export interface ATSScore {
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  candidate_location?: string;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  role_score: number;
  project_score: number;
  education_score: number;
  certification_score: number;
  matched_skills: string[];
  missing_skills: string[];
  match_label: "Strong Match" | "Good Match" | "Average Match" | "Low Match";
  match_summary: string;
  experience_years?: number;
  jd_experience_years?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Synonym map — same root concept, multiple surface forms
// ─────────────────────────────────────────────────────────────────────────────
const SYNONYMS: Record<string, string[]> = {
  "javascript": ["js", "ecmascript", "es6", "node", "nodejs", "node.js"],
  "typescript": ["ts"],
  "python": ["py"],
  "java": ["jvm"],
  "spring boot": ["springboot", "spring-boot", "spring framework"],
  "rest api": ["restful", "restful api", "rest", "http api", "web api"],
  "postgresql": ["postgres", "pg"],
  "mongodb": ["mongo"],
  "kubernetes": ["k8s"],
  "machine learning": ["ml", "artificial intelligence", "ai"],
  "deep learning": ["dl", "neural networks", "neural network"],
  "aws": ["amazon web services", "amazon cloud"],
  "gcp": ["google cloud", "google cloud platform"],
  "azure": ["microsoft azure"],
  "react": ["reactjs", "react.js"],
  "vue.js": ["vuejs", "vue"],
  "angular": ["angularjs"],
  "next.js": ["nextjs"],
  "ci/cd": ["cicd", "continuous integration", "continuous deployment", "jenkins", "github actions"],
  "docker": ["containerization", "containers"],
  "sql": ["database query", "relational database"],
  "nosql": ["non-relational", "document database"],
  "git": ["version control", "github", "gitlab", "bitbucket"],
  "agile": ["scrum", "kanban", "sprint"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9+#.\- ]/g, "");
}

/**
 * Returns true if `haystack` contains `needle` or any synonym.
 */
function flexMatch(needle: string, haystack: string): boolean {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (h.includes(n)) return true;

  // Check synonyms
  for (const [canonical, synonymList] of Object.entries(SYNONYMS)) {
    const allForms = [canonical, ...synonymList].map(normalize);
    if (allForms.includes(n)) {
      // needle is a known skill; check if any form appears in haystack
      return allForms.some((form) => h.includes(form));
    }
  }
  return false;
}

/**
 * Compute total experience years from work history entries (fallback when
 * years_of_experience is not stored directly on the candidate).
 */
function computeExperienceYears(workHistory: WorkEntry[]): number {
  let totalMonths = 0;
  const now = new Date();

  for (const w of workHistory) {
    const start = w.start_date ? new Date(w.start_date) : null;
    const end = w.is_current || !w.end_date ? now : new Date(w.end_date);
    if (!start || isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    const months = (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    if (months > 0) totalMonths += months;
  }
  return Math.round(totalMonths / 12);
}

/**
 * Build a single searchable blob from all candidate resume data.
 */
function buildCandidateBlob(candidate: CandidateData): string {
  const parts: string[] = [];

  if (candidate.summary) parts.push(candidate.summary);
  if (candidate.raw_resume_text) parts.push(candidate.raw_resume_text);
  if (candidate.skills?.length) parts.push(candidate.skills.join(" "));

  for (const w of candidate.work_history || []) {
    if (w.job_title) parts.push(w.job_title);
    if (w.company_name) parts.push(w.company_name);
    if (w.description) parts.push(w.description);
  }

  for (const e of candidate.education || []) {
    if (e.degree) parts.push(e.degree);
    if (e.institution) parts.push(e.institution);
    if (e.field_of_study) parts.push(e.field_of_study);
  }

  if (candidate.certifications?.length) {
    parts.push(candidate.certifications.join(" "));
  }

  if (candidate.projects) {
    const projText = Array.isArray(candidate.projects)
      ? candidate.projects
          .map((p: any) =>
            typeof p === "string"
              ? p
              : [p.name, p.description, p.technologies?.join(" ")].filter(Boolean).join(" ")
          )
          .join(" ")
      : String(candidate.projects);
    parts.push(projText);
  }

  if (candidate.parsed_data) {
    try {
      const pd = typeof candidate.parsed_data === "string"
        ? JSON.parse(candidate.parsed_data)
        : candidate.parsed_data;
      if (pd.skills) parts.push(Array.isArray(pd.skills) ? pd.skills.join(" ") : String(pd.skills));
      if (pd.summary) parts.push(pd.summary);
      if (pd.certifications) parts.push(Array.isArray(pd.certifications) ? pd.certifications.join(" ") : String(pd.certifications));
      if (pd.projects) parts.push(Array.isArray(pd.projects) ? pd.projects.join(" ") : String(pd.projects));
    } catch {
      // ignore JSON parse errors
    }
  }

  return parts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring functions
// ─────────────────────────────────────────────────────────────────────────────

function scoreSkills(jd: ExtractedJD, candidate: CandidateData, blob: string): {
  score: number;
  matched: string[];
  missing: string[];
} {
  if (!jd.skills.length) return { score: 0, matched: [], missing: [] };

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jd.skills) {
    // Check against skills array + full resume blob
    const inSkills = candidate.skills.some((s) => flexMatch(skill, s));
    const inBlob = flexMatch(skill, blob);

    if (inSkills || inBlob) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const score = jd.skills.length > 0
    ? Math.round((matched.length / jd.skills.length) * 100)
    : 0;

  return { score, matched, missing };
}

function scoreExperience(jd: ExtractedJD, candidate: CandidateData): number {
  const required = jd.experienceYears;
  if (!required) return 100; // No requirement specified → full credit

  let actual = candidate.years_of_experience || 0;
  if (!actual && candidate.work_history?.length) {
    actual = computeExperienceYears(candidate.work_history);
  }

  if (actual <= 0) return 0;
  if (actual >= required) return 100;

  // Partial credit: pro-rated up to the requirement
  const ratio = actual / required;
  return Math.round(Math.min(ratio * 100, 100));
}

function scoreRole(jd: ExtractedJD, candidate: CandidateData, blob: string): number {
  if (!jd.roleKeywords.length) return 100;

  let matches = 0;
  for (const role of jd.roleKeywords) {
    if (blob.toLowerCase().includes(role.toLowerCase())) {
      matches++;
    }
  }

  // Weight important role seniority keywords more heavily
  const seniorityWords = ["senior", "lead", "principal", "architect", "staff"];
  const jdWantsSenior = jd.roleKeywords.some((r) => seniorityWords.includes(r.toLowerCase()));
  const candidateIsSenior = seniorityWords.some((s) => blob.toLowerCase().includes(s));
  if (jdWantsSenior && !candidateIsSenior) {
    return Math.round((matches / jd.roleKeywords.length) * 60); // Penalize
  }

  return Math.round(Math.min((matches / jd.roleKeywords.length) * 100, 100));
}

function scoreProjects(jd: ExtractedJD, candidate: CandidateData): number {
  // Check if candidate has projects that mention JD tech keywords
  const projectBlob = (() => {
    const parts: string[] = [];
    if (candidate.projects) {
      const arr = Array.isArray(candidate.projects) ? candidate.projects : [candidate.projects];
      for (const p of arr) {
        if (typeof p === "string") parts.push(p);
        else if (p && typeof p === "object") {
          if (p.name) parts.push(p.name);
          if (p.description) parts.push(p.description);
          if (p.technologies) parts.push(Array.isArray(p.technologies) ? p.technologies.join(" ") : String(p.technologies));
        }
      }
    }
    for (const w of candidate.work_history || []) {
      if (w.description) parts.push(w.description);
    }
    return parts.join(" ").toLowerCase();
  })();

  if (!projectBlob) return 40; // Candidate has no project info — give minimal base

  const jdTechKeywords = jd.skills.slice(0, 10); // Top skills as project tech signals
  if (!jdTechKeywords.length) return 50;

  let hits = 0;
  for (const skill of jdTechKeywords) {
    if (flexMatch(skill, projectBlob)) hits++;
  }

  return Math.round((hits / jdTechKeywords.length) * 100);
}

function scoreEducation(jd: ExtractedJD, candidate: CandidateData, blob: string): number {
  if (!jd.educationKeywords.length) return 100; // No requirement stated

  let matches = 0;
  for (const edu of jd.educationKeywords) {
    if (blob.toLowerCase().includes(edu.toLowerCase())) {
      matches++;
    }
  }

  // Partial credit: matching any keyword is decent
  return Math.min(Math.round((matches / jd.educationKeywords.length) * 100), 100);
}

function scoreCertification(jd: ExtractedJD, candidate: CandidateData, blob: string): number {
  if (!jd.certificationKeywords.length) return 100; // No certs required

  let matches = 0;
  for (const cert of jd.certificationKeywords) {
    if (blob.toLowerCase().includes(cert.toLowerCase())) {
      matches++;
    }
    if (candidate.certifications?.some((c) => c.toLowerCase().includes(cert.toLowerCase()))) {
      matches++;
    }
  }

  return Math.min(Math.round((matches / jd.certificationKeywords.length) * 100), 100);
}

function getMatchLabel(score: number): ATSScore["match_label"] {
  if (score >= 90) return "Strong Match";
  if (score >= 75) return "Good Match";
  if (score >= 60) return "Average Match";
  return "Low Match";
}

function buildSummary(
  jd: ExtractedJD,
  matched: string[],
  missing: string[],
  overall: number,
  expYears: number
): string {
  const label = getMatchLabel(overall);
  const expReq = jd.experienceYears ? ` ${jd.experienceYears}+ years required;` : "";
  const expActual = expYears ? ` candidate has ${expYears} years.` : "";

  if (overall >= 90) {
    return `${label}. Candidate satisfies most JD requirements with ${matched.length} matched skills.${expReq}${expActual}`;
  } else if (overall >= 75) {
    return `${label}. Strong alignment on ${matched.length} skills. Missing: ${missing.slice(0, 3).join(", ")}.${expReq}${expActual}`;
  } else if (overall >= 60) {
    return `${label}. Partial fit — ${matched.length} skills match, missing ${missing.slice(0, 5).join(", ")}.${expReq}${expActual}`;
  } else {
    return `${label}. Candidate covers only ${matched.length} of ${jd.skills.length} required skills.${expReq}${expActual}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main public function
// ─────────────────────────────────────────────────────────────────────────────

export function scoreCandidate(jd: ExtractedJD, candidate: CandidateData): ATSScore {
  const blob = buildCandidateBlob(candidate);

  // Dimension scores
  const { score: skillScore, matched, missing } = scoreSkills(jd, candidate, blob);
  const experienceScore = scoreExperience(jd, candidate);
  const roleScore = scoreRole(jd, candidate, blob);
  const projectScore = scoreProjects(jd, candidate);
  const educationScore = scoreEducation(jd, candidate, blob);
  const certificationScore = scoreCertification(jd, candidate, blob);

  // Weighted overall score
  const overall = Math.round(
    skillScore * 0.50 +
    experienceScore * 0.20 +
    roleScore * 0.10 +
    projectScore * 0.10 +
    educationScore * 0.05 +
    certificationScore * 0.05
  );

  const expYears =
    candidate.years_of_experience ||
    computeExperienceYears(candidate.work_history || []);

  return {
    candidate_id: candidate.id,
    candidate_name: candidate.full_name,
    candidate_email: candidate.email,
    candidate_phone: candidate.phone,
    candidate_location: candidate.location,
    overall_score: Math.min(overall, 100),
    skill_score: skillScore,
    experience_score: experienceScore,
    role_score: roleScore,
    project_score: projectScore,
    education_score: educationScore,
    certification_score: certificationScore,
    matched_skills: matched,
    missing_skills: missing,
    match_label: getMatchLabel(overall),
    match_summary: buildSummary(jd, matched, missing, overall, expYears),
    experience_years: expYears,
    jd_experience_years: jd.experienceYears,
  };
}

/**
 * Score ALL candidates and return them sorted by overall_score descending.
 */
export function rankCandidates(jd: ExtractedJD, candidates: CandidateData[]): ATSScore[] {
  // 1. Filter candidates strictly by JD experience requirements
  let validCandidates = candidates;
  if (jd.experienceMin !== null && jd.experienceMin !== undefined) {
    validCandidates = validCandidates.filter((c) => {
      const expYears = c.years_of_experience || computeExperienceYears(c.work_history || []);
      
      // Candidate must have at least the minimum required
      if (expYears < jd.experienceMin!) return false;
      
      // If a maximum is specified, candidate must not exceed it
      if (jd.experienceMax !== null && jd.experienceMax !== undefined && expYears > jd.experienceMax) return false;
      
      return true;
    });
  }

  // 2. Score and rank remaining valid candidates
  const scored = validCandidates.map((c) => scoreCandidate(jd, c));
  return scored.sort((a, b) => b.overall_score - a.overall_score);
}
