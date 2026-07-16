import { useMemo, useState } from "react";

type DebugPanelProps = {
  debug: unknown;
};

const pretty = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default function DebugPanel({ debug }: DebugPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    if (!debug || typeof debug !== "object") return null;
    const obj = debug as Record<string, any>;
    const extraction = obj.text_extraction;
    const sections = obj.sections;
    const we = obj.work_experience;
    const cert = obj.certifications;
    return {
      extraction_method: extraction?.method,
      used_ocr: extraction?.used_ocr,
      ocr_confidence: extraction?.ocr_confidence,
      max_header_confidence:
        sections?.max_header_confidence ?? sections?.max_header_confidence,
      work_method: we?.method,
      cert_source: cert?.source,
      llm_section_boundary_triggered: obj.section_boundary_llm?.triggered,
    };
  }, [debug]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Debug</h2>
          <p className="text-sm text-slate-500">
            Parsing observability bundle (extraction methods, fallbacks, scores)
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
        >
          {expanded ? "Hide" : "Show"}
        </button>
      </div>

      {summary ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {key.replaceAll("_", " ")}
              </p>
              <p className="mt-1 break-all text-sm text-slate-900">
                {value === undefined || value === null || value === ""
                  ? "—"
                  : String(value)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          No debug bundle available for this parsing job yet.
        </div>
      )}

      {expanded ? (
        <pre className="mt-4 max-h-[70vh] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
          {pretty(debug)}
        </pre>
      ) : null}
    </section>
  );
}
