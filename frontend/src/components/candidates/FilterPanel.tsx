import { useMemo } from "react";
import { useFilterStore } from "../../store/filterStore";
import type { Candidate } from "../../types/candidate";

type FilterPanelProps = {
  candidates: Candidate[];
};

export default function FilterPanel({ candidates }: FilterPanelProps) {
  const {
    skills,
    location,
    minExperience,
    maxExperience,
    setSkills,
    setLocation,
    setExperience,
  } = useFilterStore();

  const skillOptions = useMemo(() => {
    const allSkills = candidates.flatMap((candidate) => candidate.skills ?? []);
    return Array.from(new Set(allSkills.map((skill) => skill.name)));
  }, [candidates]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Location
          </label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. San Francisco"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Experience (years)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              value={minExperience ?? ""}
              onChange={(event) =>
                setExperience(
                  event.target.value ? Number(event.target.value) : null,
                  maxExperience,
                )
              }
              placeholder="Min"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={maxExperience ?? ""}
              onChange={(event) =>
                setExperience(
                  minExperience,
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              placeholder="Max"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Skills
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {skillOptions.slice(0, 10).map((skill) => (
              <button
                key={skill}
                onClick={() =>
                  setSkills(
                    skills.includes(skill)
                      ? skills.filter((item) => item !== skill)
                      : [...skills, skill],
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  skills.includes(skill)
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
