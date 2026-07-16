/**
 * Experience Calculation Service
 *
 * Calculates total work experience from date intervals using an
 * interval-merging algorithm to avoid double-counting overlapping jobs.
 *
 * Also provides a text-based fallback for extracting experience
 * mentions from resume summary/raw text.
 */

/**
 * Parse a raw date value from the work history row into a JS Date.
 * Accepts Date objects, ISO strings, and "YYYY-MM-DD" strings.
 * Returns null for invalid / future-only sentinels.
 */
function toDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim().toLowerCase();
  if (["present", "current", "now", "till date"].includes(s)) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  if (y < 1900 || y > 2100) return null;
  return d;
}

interface DateInterval {
  start: Date;
  end: Date; // inclusive upper bound (present jobs → now)
}

/**
 * Merge overlapping date intervals (union of all intervals).
 * Returns a list of non-overlapping, sorted intervals.
 */
function mergeIntervals(intervals: DateInterval[]): DateInterval[] {
  if (intervals.length === 0) return [];

  // Sort by start date
  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const merged: DateInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      // Overlapping — extend the end if needed
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Calculate total years of experience from work history rows.
 * Each row should have: start_date, end_date, is_current.
 *
 * Returns:
 *   years     — decimal years (e.g. 3.4)
 *   formatted — human-readable string  (e.g. "3.4 Years Experience")
 *   source    — "calculated" | "none"
 */
export function calculateExperienceFromWorkHistory(workItems: any[]): {
  years: number | null;
  formatted: string | null;
  source: "calculated" | "none";
} {
  const now = new Date();
  const intervals: DateInterval[] = [];

  for (const w of workItems) {
    const start = toDate(w.start_date);
    if (!start) continue; // cannot use without a start date

    const isCurrent =
      w.is_current ||
      ["present", "current", "now", "till date"].includes(
        String(w.end_date || "").trim().toLowerCase()
      );

    const end = isCurrent ? now : toDate(w.end_date) || now;

    if (start > end) continue; // invalid range — skip

    intervals.push({ start, end });
  }

  if (intervals.length === 0) {
    return { years: null, formatted: null, source: "none" };
  }

  const merged = mergeIntervals(intervals);

  // Sum duration in milliseconds
  const totalMs = merged.reduce(
    (sum, iv) => sum + (iv.end.getTime() - iv.start.getTime()),
    0
  );

  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  const years = totalMs / MS_PER_YEAR;

  if (years <= 0) return { years: null, formatted: null, source: "none" };

  // Round to 1 decimal place
  const rounded = Math.round(years * 10) / 10;
  const formatted = formatExperienceYears(rounded);

  return { years: rounded, formatted, source: "calculated" };
}

/**
 * Format decimal years into a human-readable experience string.
 * Examples:
 *   0.5  → "6 Months Experience"
 *   1.0  → "1 Year Experience"
 *   3.4  → "3.4 Years Experience"
 */
export function formatExperienceYears(years: number): string {
  if (years < 0.083) return "Less than 1 Month Experience"; // < 1 month
  if (years < 1) {
    const months = Math.round(years * 12);
    return `${months} Month${months !== 1 ? "s" : ""} Experience`;
  }
  if (years === 1) return "1 Year Experience";
  return `${years} Years Experience`;
}

/**
 * Try to extract a years-of-experience value from free text
 * (e.g. "5+ years of experience", "over 3 years in software").
 *
 * Returns the extracted year value as a number, or null if not found.
 */
export function extractExperienceFromText(text: string | null | undefined): number | null {
  if (!text) return null;

  // Patterns like "5 years", "5+ years", "5.5 years", "over 5 years",
  // "more than 5 years", "5 yrs"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?(?:experience|exp|work)/i,
    /(?:over|more than|around|approximately|~)\s*(\d+(?:\.\d+)?)\s*\+?\s*years?/i,
    /(\d+(?:\.\d+)?)\s*\+?\s*yrs?\s+(?:of\s+)?(?:experience|exp)/i,
    /experience\s+of\s+(\d+(?:\.\d+)?)\s*\+?\s*years?/i,
    /(\d+(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?(?:total|combined|cumulative)\s+(?:experience|exp)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0 && val <= 60) {
        return Math.round(val * 10) / 10;
      }
    }
  }

  return null;
}

/**
 * Get the best experience value:
 * - Prefer calculated (from work history intervals) if available
 * - Fall back to text-extracted value
 * - Returns { years, formatted } or null
 */
export function getBestExperience(
  calculated: ReturnType<typeof calculateExperienceFromWorkHistory>,
  textFallbackYears: number | null
): { years: number; formatted: string } | null {
  // Prefer calculated
  if (calculated.source === "calculated" && calculated.years !== null) {
    return {
      years: calculated.years,
      formatted: calculated.formatted!,
    };
  }

  // Fall back to text extraction
  if (textFallbackYears !== null && textFallbackYears > 0) {
    return {
      years: textFallbackYears,
      formatted: formatExperienceYears(textFallbackYears),
    };
  }

  return null;
}
