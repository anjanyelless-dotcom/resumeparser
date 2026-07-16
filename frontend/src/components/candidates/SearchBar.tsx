import { useEffect, useMemo, useState } from "react";
import { Search, Building2, Briefcase } from "lucide-react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useFilterStore } from "../../store/filterStore";
import type { Candidate } from "../../types/candidate";

type SearchBarProps = {
  candidates: Candidate[];
};

export default function SearchBar({ candidates }: SearchBarProps) {
  const { setSearchTerm, setCompany, setJobTitle } = useFilterStore();
  const [value, setValue] = useState("");
  const [companyValue, setCompanyValue] = useState("");
  const [jobTitleValue, setJobTitleValue] = useState("");
  const debounced = useDebouncedValue(value, 400);
  const debouncedCompany = useDebouncedValue(companyValue, 400);
  const debouncedJobTitle = useDebouncedValue(jobTitleValue, 400);

  const suggestions = useMemo(() => {
    if (!debounced) return [];
    const lower = debounced.toLowerCase();
    const names = candidates
      .map((candidate) => candidate.full_name)
      .filter(Boolean)
      .map((name) => name as string)
      .filter((name) => name.toLowerCase().includes(lower));
    return Array.from(new Set(names)).slice(0, 5);
  }, [candidates, debounced]);

  const companySuggestions = useMemo(() => {
    if (!debouncedCompany) return [];
    const lower = debouncedCompany.toLowerCase();
    const companies = candidates
      .map((candidate) => candidate.current_company)
      .filter(Boolean)
      .map((company) => company as string)
      .filter((company) => company.toLowerCase().includes(lower));
    return Array.from(new Set(companies)).slice(0, 5);
  }, [candidates, debouncedCompany]);

  const jobTitleSuggestions = useMemo(() => {
    if (!debouncedJobTitle) return [];
    const lower = debouncedJobTitle.toLowerCase();
    const jobTitles = candidates
      .map((candidate) => candidate.current_title)
      .filter(Boolean)
      .map((title) => title as string)
      .filter((title) => title.toLowerCase().includes(lower));
    return Array.from(new Set(jobTitles)).slice(0, 5);
  }, [candidates, debouncedJobTitle]);

  useEffect(() => {
    setSearchTerm(debounced);
  }, [debounced, setSearchTerm]);

  useEffect(() => {
    setCompany(debouncedCompany);
  }, [debouncedCompany, setCompany]);

  useEffect(() => {
    setJobTitle(debouncedJobTitle);
  }, [debouncedJobTitle, setJobTitle]);

  return (
    <div className="space-y-3">
      {/* Name Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search candidates by name..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-11 z-10 rounded-xl border border-slate-200 bg-white shadow-subtle">
            {suggestions.map((item) => (
              <button
                key={item}
                onClick={() => setValue(item)}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Company Search */}
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={companyValue}
          onChange={(event) => setCompanyValue(event.target.value)}
          placeholder="Search by company..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {companySuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-11 z-10 rounded-xl border border-slate-200 bg-white shadow-subtle">
            {companySuggestions.map((item) => (
              <button
                key={item}
                onClick={() => setCompanyValue(item)}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Job Title Search */}
      <div className="relative">
        <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={jobTitleValue}
          onChange={(event) => setJobTitleValue(event.target.value)}
          placeholder="Search by job title..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {jobTitleSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-11 z-10 rounded-xl border border-slate-200 bg-white shadow-subtle">
            {jobTitleSuggestions.map((item) => (
              <button
                key={item}
                onClick={() => setJobTitleValue(item)}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
