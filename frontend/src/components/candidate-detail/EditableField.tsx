import { useEffect, useState } from "react";
import { Check, Edit2, Flag, RotateCcw, X } from "lucide-react";
import { confidenceLabel, confidenceTone } from "../../utils/confidence";

type EditableFieldProps = {
  label: string;
  value: string;
  compareValue?: string;
  confidence?: number | null;
  flagged?: boolean;
  showComparison?: boolean;
  onSave: (value: string) => void;
  validator?: (value: string) => string | null;
  readOnly?: boolean;
};

export default function EditableField({
  label,
  value,
  compareValue,
  confidence,
  flagged,
  showComparison = false,
  onSave,
  validator,
  readOnly = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const changed = compareValue !== undefined && compareValue !== value;

  const handleSave = () => {
    const message = validator ? validator(draft) : null;
    setError(message);
    if (message) return;
    onSave(draft);
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          {flagged && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <Flag className="h-3 w-3" /> Needs review
            </span>
          )}
          {changed && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              Edited
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceTone(
              confidence,
            )}`}
            title="Confidence score"
          >
            {confidenceLabel(confidence)}
          </span>
          {!readOnly && !editing ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:text-slate-700"
              aria-label={`Edit ${label}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
          ) : !readOnly ? (
            <>
              <button
                onClick={handleSave}
                className="rounded-lg border border-emerald-200 p-1 text-emerald-600 hover:text-emerald-700"
                aria-label={`Save ${label}`}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setDraft(value);
                  setEditing(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:text-slate-700"
                aria-label={`Cancel ${label}`}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleSave}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          {showComparison && compareValue && (
            <p className="text-xs text-slate-400">
              Original: <span className="font-medium">{compareValue}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2 text-sm text-slate-700">
          {value || <span className="text-slate-400">Not provided</span>}
          {!readOnly && showComparison && compareValue && (
            <button
              onClick={() => onSave(compareValue)}
              className="ml-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
