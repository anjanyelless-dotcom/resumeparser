import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import type { Education } from "../../types";
import Modal from "../common/Modal";
import {
  createEducation,
  updateEducation,
  deleteEducation,
  type EducationPayload,
} from "../../services/api/candidates";

type EducationSectionProps = {
  candidateId: string;
  items?: Education[];
  onUpdate?: (updated: Education[]) => void;
  readOnly?: boolean;
  activeFieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
};

const emptyForm: EducationPayload & { id?: string } = {
  institution: "",
  degree: "",
  field_of_study: "",
  start_date: "",
  end_date: "",
  description: "",
};

function toPayload(item: Partial<Education>): EducationPayload {
  return {
    institution: item.institution ?? null,
    degree: item.degree ?? null,
    field_of_study: item.field_of_study ?? null,
    start_date: item.start_date ?? null,
    end_date: item.end_date ?? null,
    gpa: item.gpa ? Number(item.gpa) : null,
    description: item.description ?? null,
  };
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

/** True if id is a synthetic parsed ID (parsed-edu-0, etc.), not a DB UUID */
function isParsedId(id: string): boolean {
  return /^parsed-/.test(id);
}

export default function EducationSection({
  candidateId,
  items = [],
  onUpdate,
  readOnly = false,
  activeFieldId = null,
  onFieldSelect,
}: EducationSectionProps) {
  const isActive = activeFieldId === "education";
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EducationPayload & { id?: string }>(
    emptyForm,
  );
  const [saving, setSaving] = useState(false);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: Education) => {
    setEditingId(item.id);
    setForm({
      ...toPayload(item),
      id: item.id,
      start_date: formatDate(item.start_date) || undefined,
      end_date: formatDate(item.end_date) || undefined,
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: EducationPayload = {
        institution: form.institution || null,
        degree: form.degree || null,
        field_of_study: form.field_of_study || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        gpa: form.gpa || null,
        description: form.description || null,
      };
      if (editingId && !isParsedId(editingId)) {
        const updated = await updateEducation(candidateId, editingId, payload);
        onUpdate?.(updated.education ?? []);
        toast.success("Education updated");
      } else {
        const updated = await createEducation(candidateId, payload);
        onUpdate?.(updated.education ?? []);
        toast.success("Education added");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (entry: Education) => {
      if (
        !window.confirm("Remove this education entry? This cannot be undone.")
      )
        return;
      try {
        if (isParsedId(entry.id)) {
          const filtered = items.filter((i) => i.id !== entry.id);
          onUpdate?.(filtered);
          toast.success("Education removed");
        } else {
          const updated = await deleteEducation(candidateId, entry.id);
          onUpdate?.(updated.education ?? []);
          toast.success("Education removed");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    },
    [candidateId, items, onUpdate],
  );

  return (
    <div
      role={onFieldSelect ? "button" : undefined}
      tabIndex={onFieldSelect ? 0 : undefined}
      onClick={() => onFieldSelect?.("education")}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFieldSelect?.("education");
      }}
      className={`rounded-lg border p-6 transition-all duration-200 ${
        isActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Education</h2>
        {!readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openAdd();
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add Education
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No education records.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  🎓
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.institution || "Institution"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.degree || "Degree"}
                    {item.field_of_study ? ` · ${item.field_of_study}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.start_date || "—"} → {item.end_date || "—"}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-xs text-slate-600">
                      {item.description}
                    </p>
                  )}
                  {item.gpa != null && (
                    <p className="mt-1 text-xs font-medium text-slate-700">
                      GPA / Percentage: {item.gpa}
                    </p>
                  )}
                </div>
              </div>
              {!readOnly && (
                <div
                  className="flex shrink-0 gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Education" : "Add Education"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Degree
            </label>
            <input
              type="text"
              value={form.degree ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, degree: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Bachelor of Technology"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              University / College Name
            </label>
            <input
              type="text"
              value={form.institution ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, institution: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Koneru Lakshmaiah University"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Field of Study
            </label>
            <input
              type="text"
              value={form.field_of_study ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, field_of_study: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Computer Science & Engineering"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                GPA / Percentage
              </label>
              <input
                type="number"
                step="0.01"
                value={form.gpa ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gpa: e.target.value ? parseFloat(e.target.value) : null }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 3.8 or 85"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description (optional)
            </label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Additional details..."
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
