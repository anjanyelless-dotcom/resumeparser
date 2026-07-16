import { useEffect, useState } from "react";
import { Edit2 } from "lucide-react";

type SummarySectionProps = {
  summary?: string | null;
  onSave: (value: string) => void;
  readOnly?: boolean;
  activeFieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
};

export default function SummarySection({
  summary,
  onSave,
  readOnly = false,
  activeFieldId = null,
  onFieldSelect,
}: SummarySectionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary ?? "");

  useEffect(() => {
    setDraft(summary ?? "");
  }, [summary]);

  const isActive = activeFieldId === "summary";

  return (
    <div
      role={onFieldSelect && !editing ? "button" : undefined}
      tabIndex={onFieldSelect && !editing ? 0 : undefined}
      onClick={() => {
        if (editing) return;
        if (onFieldSelect) onFieldSelect("summary");
        else if (!readOnly) setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !editing) {
          if (onFieldSelect) onFieldSelect("summary");
          else if (!readOnly) setEditing(true);
        }
      }}
      className={`rounded-lg border p-4 transition-all duration-200 ${
        isActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
        {!readOnly && !editing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[120px] w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(summary ?? "");
                setEditing(false);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          {summary || "No summary provided yet."}
        </p>
      )}
    </div>
  );
}
