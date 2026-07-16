import type { Candidate } from "../types/candidate";

export const exportCandidatesCsv = (candidates: Candidate[]) => {
  const headers = [
    "full_name",
    "email",
    "phone",
    "location",
    "current_title",
    "current_company",
    "years_experience",
  ];
  const rows = candidates.map((candidate) =>
    headers.map((key) =>
      JSON.stringify(
        (candidate as unknown as Record<string, unknown>)[key] ?? "",
      ),
    ),
  );
  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n",
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "candidates.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
