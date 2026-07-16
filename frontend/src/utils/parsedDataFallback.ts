/**
 * Transform parsed_data (from parsing job) into display shapes for UI components
 * when DB is empty. Used for read-only fallback display.
 */

import type {
  WorkHistory,
  Education,
  Certification,
  Skill,
  CandidateSkill,
} from "../types/candidate";

const _get = (obj: any, ...keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
};

/** Placeholder company/title values that indicate malformed single-entry parsing */
const PLACEHOLDER_LABELS = new Set([
  "company",
  "professional experience",
  "experience",
  "role",
  "title",
  "client",
  "organization",
  "employer",
  "n/a",
  "na",
  "tbd",
  "tbc",
]);

function isPlaceholderLike(val: string | null | undefined): boolean {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return !lower || PLACEHOLDER_LABELS.has(lower) || lower.length < 3;
}

/** Strip Environment:/Tools:/Technologies: lines from description — those belong in Skills section */
function stripEnvironmentSkillLines(
  desc: string | null | undefined,
): string | null {
  if (!desc || typeof desc !== "string") return desc ?? null;
  const envLineRe =
    /^(?:environments?|environment|tools?|technologies|tech\s*stack)\s*[:\-–—].*$/im;
  const lines = desc.split("\n").filter((ln) => !envLineRe.test(ln.trim()));
  const out = lines.join("\n").trim();
  return out || null;
}

/**
 * Split raw text by CLIENT: blocks (consulting resume format) into structured entries.
 * Used when backend returns one merged entry instead of separate experiences.
 */
function splitRawTextByClientBlocks(text: string): WorkHistory[] {
  if (!text || typeof text !== "string") return [];
  // Split by newline before CLIENT:, or by space before CLIENT: when on same line
  const clientBlockRe =
    /\n\s*(?=(?:CLIENT|client|project)\s*[:\-–—])|\s+(?=(?:CLIENT|client|project)\s*[:\-–—])/i;
  const parts = text.split(clientBlockRe);
  const blocks = parts
    .map((p) => p.trim())
    .filter(
      (p) => p.length > 20 && /(?:CLIENT|client|project)\s*[:\-–—]/i.test(p),
    );
  if (blocks.length <= 1) return [];

  const entries: WorkHistory[] = [];
  blocks.forEach((block, idx) => {
    let client = "";
    let role = "";
    let location = "";
    let startDate = "";
    let endDate = "";
    let isCurrent = false;
    const descLines: string[] = [];

    const lines = block.split(/\n+/);
    for (const line of lines) {
      const t = line.trim();
      const clientMatch = t.match(
        /^(?:CLIENT|client|project)\s*[:\-–—]\s*(.+)$/i,
      );
      const roleMatch = t.match(
        /^(?:ROLE|role|designation|title)\s*[:\-–—]\s*(.+)$/i,
      );
      const locMatch = t.match(/^(?:location|loc)\s*[:\-–—]\s*(.+)$/i);
      const dateMatch =
        t.match(/(\d{4})\s*[-–—]\s*(current|present|now|(\d{4}))/i) ??
        t.match(
          /([A-Za-z]+\s+\d{4})\s*[-–—]\s*(current|present|now|([A-Za-z]+\s+\d{4}))/i,
        );

      if (clientMatch) client = clientMatch[1].trim();
      else if (roleMatch) role = roleMatch[1].trim();
      else if (locMatch) location = locMatch[1].trim();
      else if (dateMatch) {
        startDate = dateMatch[1]?.trim() ?? "";
        const endPart = dateMatch[2] ?? dateMatch[3] ?? "";
        isCurrent = /current|present|now/i.test(endPart);
        endDate = isCurrent ? "" : (endPart?.trim() ?? "");
      } else if (
        t &&
        !/^(?:responsibilities?|key\s+responsibilities?)\s*[:\-–—]?$/i.test(
          t,
        ) &&
        !/^(?:environments?|environment|tools?|technologies|tech\s*stack)\s*[:\-–—]/i.test(
          t,
        )
      ) {
        descLines.push(t);
      }
    }

    const description = descLines.join("\n").trim();
    entries.push({
      id: `parsed-we-split-${idx}`,
      company_name: client || null,
      client_name: client || null,
      job_title: role || null,
      start_date: startDate || null,
      end_date: endDate || null,
      is_current: isCurrent,
      location: location || null,
      description: description || null,
    });
  });
  return entries;
}

/** Map parsed_data.work_experience to WorkHistory[] */
export function workHistoryFromParsed(items: any[] | undefined): WorkHistory[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => ({
    id: `parsed-we-${idx}`,
    company_name: _get(item, "company_name", "company") ?? null,
    client_name: _get(item, "client_name", "client") ?? null,
    job_title: _get(item, "job_title", "title", "role") ?? null,
    start_date: _get(item, "start_date") ?? null,
    end_date: _get(item, "end_date") ?? null,
    is_current: Boolean(item?.is_current ?? null),
    location: _get(item, "location") ?? null,
    description: stripEnvironmentSkillLines(_get(item, "description")) ?? null,
  }));
}

/** Map parsed_data.education to Education[] — supports both API shape (description) and parser shape (honors). */
export function educationFromParsed(items: any[] | undefined): Education[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => {
    const description =
      _get(item, "description") ?? _get(item, "honors") ?? null;
    const startDate = _normDateStr(item?.start_date);
    const endDate = _normDateStr(item?.end_date);
    return {
      id: item?.id ?? `parsed-edu-${idx}`,
      institution: _get(item, "institution") ?? null,
      degree: _get(item, "degree") ?? null,
      field_of_study: _get(item, "field_of_study") ?? null,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      gpa: item?.gpa ?? item?.grade ?? null,
      description,
    };
  });
}

/** Normalize date to YYYY-MM-DD string for display (API/parsed may send ISO or date object). */
function _normDateStr(value: any): string | null | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return undefined;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  }
  if (typeof value === "object" && typeof value.toISOString === "function") {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

/** Map parsed_data.certifications to Certification[] */
export function certificationsFromParsed(
  items: any[] | undefined,
): Certification[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => ({
    id: `parsed-cert-${idx}`,
    name: _get(item, "name") ?? "",
    issuing_organization: _get(item, "issuing_organization") ?? null,
    issue_date: _get(item, "issue_date") ?? null,
    expiry_date: _get(item, "expiry_date") ?? null,
    credential_id: _get(item, "credential_id") ?? null,
  }));
}

/** Map parsed_data.skills to Skill[] and CandidateSkill[] */
export function skillsFromParsed(items: any[] | undefined): {
  skills: Skill[];
  candidateSkills: CandidateSkill[];
} {
  if (!Array.isArray(items)) return { skills: [], candidateSkills: [] };
  const skills: Skill[] = [];
  const candidateSkills: CandidateSkill[] = [];
  items.forEach((item, idx) => {
    const name =
      typeof item === "string"
        ? item.trim()
        : (_get(item, "name", "normalized_name") ?? "");
    if (!name) return;
    const skill: Skill = {
      id: `parsed-skill-${idx}`,
      name,
      category: _get(item, "category") ?? "Other",
      normalized_name: _get(item, "normalized_name", "name") ?? null,
    };
    skills.push(skill);
    candidateSkills.push({
      skill,
      proficiency_level: _get(item, "proficiency_level") ?? "intermediate",
      years_experience: null,
    });
  });
  return { skills, candidateSkills };
}

/** Extract contact display from parsed_data.contact */
export function contactFromParsed(contact: any): {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
} {
  if (!contact || typeof contact !== "object") {
    return { full_name: null, email: null, phone: null, location: null };
  }
  const name =
    (typeof contact.name === "string" ? contact.name : contact?.name?.name) ??
    contact?.full_name ??
    "";
  const email = contact?.emails?.[0]?.email ?? contact?.email ?? "";
  const phone = contact?.phones?.[0]?.phone ?? contact?.phone ?? "";
  const loc = contact?.location;
  const location =
    typeof loc === "string"
      ? loc
      : loc && typeof loc === "object"
        ? [loc.city, loc.state, loc.country].filter(Boolean).join(", ") || null
        : null;
  return {
    full_name: name?.trim() || null,
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    location: location?.trim() || null,
  };
}

/** Extract summary from parsed_data.sections */
export function summaryFromParsed(parsed: any): string | null {
  const content = parsed?.sections?.summary?.content;
  return typeof content === "string" ? content.trim() || null : null;
}

/** Get raw section content (e.g. sections.experience.content) when structured list is empty */
function getSectionContent(parsed: any, sectionKey: string): string | null {
  const content = parsed?.sections?.[sectionKey]?.content;
  return typeof content === "string" ? content.trim() || null : null;
}

/**
 * Work history for display: use structured work_experience, or one item from
 * sections.experience.content when structured list is empty (so UI matches export).
 * When a single entry looks like raw merged text (placeholder labels, long description
 * with multiple CLIENT: blocks), try to split it into separate entries.
 */
export function getDisplayWorkHistory(
  parsedData: Record<string, any>,
  dbHistory: WorkHistory[],
): WorkHistory[] {
  if (dbHistory && dbHistory.length > 0) {
    return dbHistory;
  }
  let structured = workHistoryFromParsed(parsedData.work_experience);

  // If we have exactly one entry that looks like raw merged text, try split by CLIENT:
  if (structured.length === 1) {
    const entry = structured[0];
    const desc = entry.description ?? "";
    const isPlaceholder =
      isPlaceholderLike(entry.company_name) ||
      isPlaceholderLike(entry.job_title);
    const hasMultipleClients =
      (desc.match(/(?:CLIENT|client|project)\s*[:\-–—]/gi) ?? []).length > 1;
    if (isPlaceholder && desc.length > 500 && hasMultipleClients) {
      const split = splitRawTextByClientBlocks(desc);
      if (split.length > 1) structured = split;
    }
  }

  if (structured.length > 0) return structured;

  const rawContent =
    getSectionContent(parsedData, "experience") ??
    getSectionContent(parsedData, "professional experience") ??
    getSectionContent(parsedData, "professional_experience");
  if (rawContent) {
    // Try to split raw section by CLIENT: before creating single raw block
    const split = splitRawTextByClientBlocks(rawContent);
    if (split.length > 1) return split;
    return [
      {
        id: "parsed-we-section",
        company_name: null,
        client_name: null,
        job_title: "Professional Experience",
        start_date: null,
        end_date: null,
        is_current: false,
        location: null,
        description: rawContent,
      },
    ];
  }
  return [];
}

/**
 * Education for display: use structured education, or one item from
 * sections.education.content when structured list is empty.
 */
export function getDisplayEducation(
  parsedData: Record<string, any>,
  dbEducation: Education[],
): Education[] {
  if (dbEducation && dbEducation.length > 0) {
    return dbEducation;
  }

  const structured = educationFromParsed(parsedData.education);
  if (structured.length > 0) return structured;
  const rawContent = getSectionContent(parsedData, "education");
  if (rawContent) {
    return [
      {
        id: "parsed-edu-section",
        institution: null,
        degree: null,
        field_of_study: null,
        start_date: null,
        end_date: null,
        description: rawContent,
      },
    ];
  }
  return [];
}

/**
 * Summary for display: prioritize database summary (user edits) over parsed data.
 */
export function getDisplaySummary(
  parsedData: Record<string, any>,
  dbSummary: string | null | undefined,
  summaryManuallyEdited?: boolean,
): string {
  const parsed = summaryFromParsed(parsedData)?.trim() ?? "";
  const db = (dbSummary ?? "").trim();

  // If user manually edited — always show their edited text
  if (summaryManuallyEdited && db.length > 0) {
    return db;
  }

  // Otherwise show parsed (initial upload state) if available
  if (parsed.length > 0) {
    return parsed;
  }

  // Final fallback to database (might be empty)
  return db;
}

/**
 * Certifications for display: prefer parsed when it has items.
 */
export function getDisplayCertifications(
  parsedData: Record<string, any>,
  dbCerts: Certification[],
): Certification[] {
  //Always prefer DB if it has data
  if (dbCerts && dbCerts.length > 0) {
    return dbCerts;
  }
  const structured = certificationsFromParsed(parsedData.certifications);
  if (structured.length > 0) return structured;
  return [];
}

/** Check if we should use parsed_data fallback (DB empty but parsed has data) */
export function shouldUseParsedDataFallback(
  candidate: {
    work_history?: any[];
    education?: any[];
    certifications?: any[];
    candidate_skills?: any[];
    skills?: any[];
    full_name?: string | null;
    summary?: string | null;
  } | null,
  parsedData: Record<string, any>,
): boolean {
  if (!candidate || !parsedData) return false;
  const hasDbWork = (candidate.work_history?.length ?? 0) > 0;
  const hasDbEdu = (candidate.education?.length ?? 0) > 0;
  const hasDbCerts = (candidate.certifications?.length ?? 0) > 0;
  const hasDbSkills =
    (candidate.candidate_skills?.length ?? 0) > 0 ||
    (candidate.skills?.length ?? 0) > 0;
  const hasDbName = Boolean(candidate.full_name?.trim());
  const hasDbSummary = Boolean(candidate.summary?.trim());

  const hasParsedWork =
    Array.isArray(parsedData.work_experience) &&
    parsedData.work_experience.length > 0;
  const hasParsedEdu =
    Array.isArray(parsedData.education) && parsedData.education.length > 0;
  const hasParsedCerts =
    Array.isArray(parsedData.certifications) &&
    parsedData.certifications.length > 0;
  const hasParsedSkills =
    Array.isArray(parsedData.skills) && parsedData.skills.length > 0;
  const contact = parsedData.contact;
  const hasParsedName = Boolean(
    contact?.name?.name?.trim() || contact?.full_name?.trim(),
  );
  const hasParsedSummary = Boolean(summaryFromParsed(parsedData));

  const dbEmpty =
    !hasDbWork &&
    !hasDbEdu &&
    !hasDbCerts &&
    !hasDbSkills &&
    !hasDbName &&
    !hasDbSummary;
  const parsedHasData =
    hasParsedWork ||
    hasParsedEdu ||
    hasParsedCerts ||
    hasParsedSkills ||
    hasParsedName ||
    hasParsedSummary;

  return dbEmpty && parsedHasData;
}
