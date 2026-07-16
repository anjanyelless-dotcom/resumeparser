import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Filter, UserRound } from "lucide-react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import {
  fetchRecentCorrections,
  type CorrectionRecord,
} from "../services/api/corrections";

export default function CorrectionsPage() {
  const [rows, setRows] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchRecentCorrections();
        setRows(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load corrections",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const term = search.toLowerCase();
    return rows.filter((row) => {
      return (
        row.candidate_name?.toLowerCase().includes(term) ||
        row.candidate_email?.toLowerCase().includes(term) ||
        row.field.toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Corrections</h1>
          <p className="mt-2 text-sm text-slate-600">
            Review human feedback applied to parsed resumes.
          </p>
        </div>
        <Button variant="secondary" icon={<Filter className="h-4 w-4" />}>
          Filter
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardCheck className="h-4 w-4 text-brand-600" />
            Recent corrections
          </div>
          <div className="mt-4">
            <Input
              placeholder="Search candidate or field..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1.2fr_0.9fr_1fr_1fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
              <span>Candidate</span>
              <span>Field</span>
              <span>Original</span>
              <span>Corrected</span>
              <span>Date</span>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Loading...
                </div>
              ) : error ? (
                <div className="px-4 py-6 text-sm text-red-500">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No corrections found.
                </div>
              ) : (
                filtered.map((row) => (
                  <div
                    key={`${row.corrected_at}-${row.field}`}
                    className="grid grid-cols-[1.2fr_0.9fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 text-sm text-slate-700"
                  >
                    <span className="font-medium text-slate-900">
                      {row.candidate_name ?? row.candidate_email ?? "Unknown"}
                    </span>
                    <span className="text-slate-500">{row.field}</span>
                    <span className="text-slate-500">
                      {row.original ?? "—"}
                    </span>
                    <span className="font-medium text-brand-700">
                      {row.corrected ?? "—"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(row.corrected_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
            <h3 className="text-sm font-semibold text-slate-900">
              Reviewer activity
            </h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {["Admin", "Reviewer", "Recruiter"].map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-slate-500" />
                    <span>{name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {loading
                      ? "—"
                      : `${
                          rows.filter((row) =>
                            (row.reviewer || "")
                              .toLowerCase()
                              .includes(name.toLowerCase()),
                          ).length
                        } edits`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
            <h3 className="text-sm font-semibold text-slate-900">
              Most corrected fields
            </h3>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {[
                "contact.name.name",
                "education.degree",
                "work_experience.company",
              ].map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span>{field}</span>
                  <span className="text-xs text-slate-400">Needs training</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
