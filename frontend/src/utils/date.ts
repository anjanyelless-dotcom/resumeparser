export const parseToDateInput = (rawDateStr: string | null | undefined): string => {
  if (!rawDateStr) return "";
  
  // Clean up punctuation (like "[2021" or "2021]")
  const dateStr = rawDateStr.replace(/[^\w\s/-]/g, '').trim();

  // If already YYYY-MM-DD, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle "Present" or "Current"
  if (dateStr.toLowerCase().includes("present") || dateStr.toLowerCase().includes("current")) {
    return "";
  }

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Return YYYY-MM-DD
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore error and fall through
  }

  // Handle "MM/YYYY" or "M/YYYY"
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const year = slashMatch[2];
    return `${year}-${month}-01`;
  }

  // Handle "YYYY"
  const yearMatch = dateStr.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`;
  }

  // Handle "Month YYYY" like "Jan 2023"
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const wordMatch = dateStr.toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (wordMatch) {
    const monthWord = wordMatch[1];
    const year = wordMatch[2];
    const monthIndex = monthNames.findIndex(m => monthWord.startsWith(m));
    if (monthIndex !== -1) {
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      return `${year}-${monthStr}-01`;
    }
  }

  return "";
};

export const formatDateOutput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  
  // If it's a YYYY-MM-DD from calendar, return it
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  return dateStr;
};
