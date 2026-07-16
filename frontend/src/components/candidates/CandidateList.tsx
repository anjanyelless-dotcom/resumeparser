import type { Candidate } from "../../types/candidate";
import { Link } from "react-router-dom";

type CandidateListProps = {
  candidates: Candidate[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSort: (key: keyof Candidate) => void;
  sortKey: keyof Candidate;
  sortDirection: "asc" | "desc";
};

const headers: { key: keyof Candidate; label: string }[] = [
  { key: "full_name", label: "Name" },
  { key: "current_title", label: "Title" },
  { key: "current_company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "years_experience", label: "Experience" },
];

export default function CandidateList({
  candidates,
  selectedIds,
  onToggle,
  onSort,
  sortKey,
  sortDirection,
}: CandidateListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">
              <span className="sr-only">Select</span>
            </th>
            {headers.map((header) => (
              <th
                key={header.key}
                className="cursor-pointer px-4 py-3"
                onClick={() => onSort(header.key)}
              >
                <div className="flex items-center gap-2">
                  {header.label}
                  {sortKey === header.key && (
                    <span className="text-[10px]">
                      {sortDirection === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </th>
            ))}
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id} className="border-t border-slate-100">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(candidate.id)}
                  onChange={() => onToggle(candidate.id)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">
                <Link
                  to={`/candidates/${candidate.id}`}
                  className="hover:text-brand-600"
                >
                  {candidate.full_name || "Unnamed"}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {candidate.current_title || "-"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {candidate.current_company || "-"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {candidate.location || "-"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {candidate.years_experience ?? "-"}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {candidate.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
