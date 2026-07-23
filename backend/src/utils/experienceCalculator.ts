// src/utils/experienceCalculator.ts

export interface ExperienceInput {
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  [key: string]: any;
}

// Helper functions to replace date-fns
function differenceInDays(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / oneDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export interface ParsedExperience extends ExperienceInput {
  parsed_start: Date | null;
  parsed_end: Date | null;
  duration_string: string | null;
}

export interface TotalExperienceResult {
  years: number;
  months: number;
  days: number;
  total_records: number;
  formatted_string: string;
  earliest_date?: string | null;
  latest_date?: string | null;
}

/**
 * Normalizes a date string to a Date object.
 * Handles formats like "Jan 2023", "2023-01-01", "Present", "Current".
 */
export function normalizeDate(dateStr: string | null | undefined, isCurrent: boolean = false): Date | null {
  if (isCurrent || !dateStr || dateStr.toLowerCase().includes("present") || dateStr.toLowerCase().includes("current")) {
    return new Date();
  }

  // Basic JS Date parsing handles "Jan 2023" and "2023-01-01" reasonably well
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    // Attempt fallback parsing if necessary
    // E.g., if just a year "2023"
    if (/^\d{4}$/.test(dateStr)) {
      return new Date(`${dateStr}-01-01`);
    }
    return null;
  }
  return parsed;
}

/**
 * Calculates duration string between two dates (e.g. "1 Year 2 Months")
 */
export function getDurationString(start: Date, end: Date): string {
  if (start > end) return "0 Months";

  const totalDays = differenceInDays(end, start);
  const years = Math.floor(totalDays / 365.25);
  const remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.436875);
  const days = Math.floor(remainingDays - Math.floor(months * 30.436875));

  let parts = [];
  if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
  
  // If no years or months, show days. Also if we have less than a month, show days.
  if (years === 0 && months === 0 && days > 0) {
    parts.push(`${days} Day${days > 1 ? 's' : ''}`);
  }

  return parts.join(" ") || "0 Months";
}

/**
 * Merges overlapping intervals and calculates total experience.
 */
export function calculateTotalExperience(experiences: ExperienceInput[]): {
  total: TotalExperienceResult;
  processed: ParsedExperience[];
} {
  const processed: ParsedExperience[] = [];
  const intervals: { start: Date; end: Date }[] = [];

  for (const exp of experiences) {
    const parsed_start = normalizeDate(exp.start_date, false);
    const parsed_end = normalizeDate(exp.end_date, exp.is_current || false);

    let duration_string = null;
    if (parsed_start && parsed_end && parsed_start <= parsed_end) {
      duration_string = getDurationString(parsed_start, parsed_end);
      intervals.push({ start: parsed_start, end: parsed_end });
    } else if (parsed_start && !parsed_end) {
      // If no end date, assume current
      const end = new Date();
      duration_string = getDurationString(parsed_start, end);
      intervals.push({ start: parsed_start, end });
    }

    processed.push({
      ...exp,
      parsed_start,
      parsed_end,
      duration_string,
    });
  }

  // Merge intervals (sweep line approach)
  // Sort by start date
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const interval of intervals) {
    if (merged.length === 0) {
      merged.push(interval);
    } else {
      const last = merged[merged.length - 1];
      if (interval.start <= last.end) {
        // Overlap, merge them
        if (interval.end > last.end) {
          last.end = interval.end;
        }
      } else {
        // No overlap
        merged.push(interval);
      }
    }
  }

  // Calculate total days from merged intervals
  let totalDays = 0;
  for (const interval of merged) {
    totalDays += differenceInDays(interval.end, interval.start);
  }

  const years = Math.floor(totalDays / 365.25);
  const remainingDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingDays / 30.436875);
  const days = Math.floor(remainingDays - Math.floor(months * 30.436875));

  let formatted_string = "";
  if (years > 0) formatted_string += `${years} Years `;
  if (months > 0) formatted_string += `${months} Months `;
  if (days > 0) formatted_string += `${days} Days`;
  formatted_string = formatted_string.trim() || "0 Days";

  let earliest_date = null;
  let latest_date = null;

  if (merged.length > 0) {
    const firstDate = merged[0].start;
    const lastDate = merged[merged.length - 1].end;
    earliest_date = firstDate.toISOString().split('T')[0];
    latest_date = lastDate.toISOString().split('T')[0];
  }

  return {
    total: {
      years,
      months,
      days,
      total_records: experiences.length,
      formatted_string,
      earliest_date,
      latest_date
    },
    processed,
  };
}
