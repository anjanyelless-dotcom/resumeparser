import { useEffect, useState } from "react";
import { BarChart3, ShieldCheck, TrendingUp } from "lucide-react";
import {
  fetchAccuracyOverview,
  type AccuracyOverview,
} from "../services/api/accuracy";

export default function AccuracyPage() {
  const [overview, setOverview] = useState<AccuracyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchAccuracyOverview();
        setOverview(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load accuracy",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sectionMetrics = overview?.section_scores ?? [];
  const recentRuns = overview?.recent_runs ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Accuracy dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Track extraction performance and identify weak sections.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Overall accuracy",
            value: overview ? `${overview.success_rate}%` : "—",
            icon: ShieldCheck,
            tone: "text-emerald-600",
          },
          {
            label: "Human correction rate",
            value: overview ? `${overview.correction_rate}%` : "—",
            icon: TrendingUp,
            tone: "text-amber-600",
          },
          {
            label: "Average confidence",
            value: overview ? overview.avg_confidence.toFixed(2) : "—",
            icon: BarChart3,
            tone: "text-brand-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.label}</p>
                <Icon className={`h-5 w-5 ${card.tone}`} />
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
          <h3 className="text-sm font-semibold text-slate-900">
            Section accuracy
          </h3>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : error ? (
              <div className="text-sm text-red-500">{error}</div>
            ) : sectionMetrics.length === 0 ? (
              <div className="text-sm text-slate-500">No section data yet.</div>
            ) : (
              sectionMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{metric.label}</span>
                    <span className="font-semibold text-slate-900">
                      {(metric.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${metric.score * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
          <h3 className="text-sm font-semibold text-slate-900">
            Recent parsing runs
          </h3>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : error ? (
              <div className="text-sm text-red-500">{error}</div>
            ) : recentRuns.length === 0 ? (
              <div className="text-sm text-slate-500">No runs yet.</div>
            ) : (
              recentRuns.map((run) => (
                <div
                  key={run.job_id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {run.job_id}
                    </span>
                    <span className="text-xs text-slate-400">
                      {(run.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{run.notes}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
