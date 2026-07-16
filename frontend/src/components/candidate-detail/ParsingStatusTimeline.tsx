import type { ParsingJob } from "../../types";

type ParsingStatusTimelineProps = {
  job?: ParsingJob | null;
  onRetry?: () => void;
};

const steps = [
  "extract_text",
  "detect_sections",
  "extract_contact_info",
  "parse_work_experience",
  "parse_education",
  "extract_skills",
  "parse_certifications",
  "calculate_confidence",
  "save_to_database",
];

export default function ParsingStatusTimeline({
  job,
  onRetry,
}: ParsingStatusTimelineProps) {
  if (!job) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Parsing status</h2>
        <p className="mt-3 text-sm text-slate-600">No parsing job available.</p>
      </div>
    );
  }

  const currentIndex = job.last_stage ? steps.indexOf(job.last_stage) : -1;
  const isFailed = job.status === "failed";
  const isProcessing = job.status === "processing" || job.status === "pending";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Parsing status</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {job.status}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const completed = index <= currentIndex && !isFailed;
          const active = index === currentIndex;
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`h-2 w-2 rounded-full ${
                  completed
                    ? "bg-emerald-500"
                    : active
                      ? "bg-brand-500"
                      : "bg-slate-200"
                }`}
              />
              <span
                className={`text-sm ${active ? "font-semibold text-slate-900" : "text-slate-600"}`}
              >
                {step.replace(/_/g, " ")}
              </span>
            </div>
          );
        })}
      </div>
      {job.error_message && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          <p>{job.error_message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs font-semibold text-red-700 hover:text-red-800"
            >
              Retry parsing
            </button>
          )}
        </div>
      )}
      {job.started_at && (
        <p className="mt-2 text-xs text-slate-500">
          Started: {new Date(job.started_at).toLocaleString()}
        </p>
      )}
      {isProcessing && (
        <p className="mt-1 text-xs text-slate-500">
          Estimated time remaining: 2-5 minutes
        </p>
      )}
    </div>
  );
}
