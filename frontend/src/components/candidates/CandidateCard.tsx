import type { Candidate } from "../../types/candidate";

type CandidateCardProps = {
  candidate: Candidate;
};

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const fullName = candidate.full_name || (candidate as any).name || "Unnamed candidate";
  const displayName = fullName.length > 18 ? fullName.substring(0, 18) + "..." : fullName;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex items-start justify-between">
        <div>
          <h3 
            title={fullName}
            className="text-lg font-semibold text-slate-900 truncate cursor-pointer hover:text-purple-600 transition-colors"
          >
            {displayName}
          </h3>
          <p className="text-sm text-slate-600">
            {candidate.current_title || "Role"} ·{" "}
            {candidate.current_company || "Company"}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {candidate.status}
        </span>
      </div>
      <div className="mt-3 text-sm text-slate-600">
        {candidate.location || "Location unknown"} ·{" "}
        {(candidate.years_experience ?? 0).toFixed(1)} yrs
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(candidate.skills ?? []).slice(0, 4).map((skill) => (
          <span
            key={skill.id}
            className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
          >
            {skill.name}
          </span>
        ))}
      </div>
    </div>
  );
}
