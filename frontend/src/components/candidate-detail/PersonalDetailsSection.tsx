import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollToField } from "../../hooks/useScrollToField";
import { toast } from "react-hot-toast";
import { Mail, MapPin, Phone, Linkedin, Github, Pencil } from "lucide-react";
import type { Candidate } from "../../types";
import { submitCorrections } from "../../services/api/candidates";

type PersonalDetailsSectionProps = {
  candidate: Candidate;
  onUpdate: (candidate: Candidate) => void;
  readOnly?: boolean;
  /** When set, clicking a field triggers this (e.g. scroll to resume) */
  activeFieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
  /** When set, scroll this field into view in the panel */
  panelScrollToFieldId?: string | null;
  onPanelScrollComplete?: () => void;
  /** When set, auto-open edit mode for this field (from resume click) */
  autoEditFieldId?: string | null;
  onAutoEditConsumed?: () => void;
};

const FIELD_ICONS: Record<string, React.ReactNode> = {
  full_name: null,
  email: <Mail className="h-4 w-4 text-slate-400" />,
  phone: <Phone className="h-4 w-4 text-slate-400" />,
  location: <MapPin className="h-4 w-4 text-slate-400" />,
  linkedin_url: <Linkedin className="h-4 w-4 text-slate-400" />,
  github_url: <Github className="h-4 w-4 text-slate-400" />,
};

export default function PersonalDetailsSection({
  candidate,
  onUpdate,
  readOnly = false,
  activeFieldId = null,
  onFieldSelect,
  panelScrollToFieldId = null,
  onPanelScrollComplete,
  autoEditFieldId = null,
  onAutoEditConsumed,
}: PersonalDetailsSectionProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fields = [
    {
      key: "full_name",
      id: "full_name",
      label: "Candidate Name",
      value: candidate.full_name ?? "",
    },
    {
      key: "email",
      id: "email",
      label: "Candidate Email",
      value: candidate.email ?? "",
    },
    {
      key: "phone",
      id: "phone",
      label: "Candidate Phone",
      value: candidate.phone ?? "",
    },
    {
      key: "location",
      id: "location",
      label: "Location",
      value: candidate.location ?? "",
    },
    {
      key: "linkedin_url",
      id: "linkedin_url",
      label: "LinkedIn",
      value: candidate.linkedin_url ?? "",
    },
    {
      key: "github_url",
      id: "github_url",
      label: "GitHub",
      value: candidate.github_url ?? "",
    },
  ];

  const startEdit = (key: string, value: string) => {
    if (readOnly) return;
    setEditing(key);
    setDraft(value);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const getFieldElement = useCallback(
    (fieldId: string) => fieldRefs.current[fieldId] ?? null,
    [],
  );
  useScrollToField(
    panelScrollToFieldId,
    getFieldElement,
    onPanelScrollComplete,
  );

  useEffect(() => {
    if (!autoEditFieldId || readOnly) return;
    const value = (candidate as unknown as Record<string, unknown>)[
      autoEditFieldId
    ];
    const strValue = value != null ? String(value) : "";
    startEdit(autoEditFieldId, strValue);
    onAutoEditConsumed?.();
  }, [autoEditFieldId, readOnly, onAutoEditConsumed]);

  const saveField = async (key: string) => {
    if (!candidate.id || readOnly) return;
    const original =
      (candidate as unknown as Record<string, unknown>)[key] ?? "";
    if (String(draft).trim() === String(original).trim()) {
      setEditing(null);
      return;
    }
    setSaving(true);
    try {
      const updated = await submitCorrections(candidate.id, [
        {
          field_name: key,
          original_value: original ? String(original) : null,
          corrected_value: draft.trim() || null,
        },
      ]);
      onUpdate(updated);
      setEditing(null);
      toast.success("Updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">
        Personal details
      </h3>
      <div className="space-y-4">
        {fields.map(({ key, id, label, value }) => (
          <div
            key={key}
            ref={(el) => {
              fieldRefs.current[id] = el;
            }}
            className="flex flex-col gap-1"
          >
            <label className="text-xs font-medium text-slate-500">
              {label}
            </label>
            {editing === key ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveField(key);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoFocus
                />
                <button
                  onClick={() => saveField(key)}
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if (
                    (e.target as HTMLElement).closest("[data-edit-trigger]")
                  ) {
                    startEdit(key, value);
                  } else if (onFieldSelect) {
                    onFieldSelect(id);
                  } else {
                    startEdit(key, value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (onFieldSelect) onFieldSelect(id);
                    else startEdit(key, value);
                  }
                }}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 ${
                  activeFieldId === id
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-2">
                  {FIELD_ICONS[key]}
                  <span className={value ? "" : "text-slate-400"}>
                    {value || "—"}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    data-edit-trigger
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(key, value);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
