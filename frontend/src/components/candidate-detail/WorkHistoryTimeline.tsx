import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import type { WorkHistory } from "../../types";
import Modal from "../common/Modal";
import {
  createWorkHistory,
  updateWorkHistory,
  deleteWorkHistory,
  type WorkHistoryPayload,
} from "../../services/api/candidates";

type WorkHistoryTimelineProps = {
  candidateId: string;
  items?: WorkHistory[];
  onUpdate?: (updated: WorkHistory[]) => void;
  readOnly?: boolean;
  activeFieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
};

const emptyForm: WorkHistoryPayload & { id?: string } = {
  client_name: "",
  company_name: "",
  job_title: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
};

function toPayload(item: Partial<WorkHistory>): WorkHistoryPayload {
  return {
    client_name: item.client_name ?? null,
    company_name: item.company_name ?? null,
    job_title: item.job_title ?? null,
    location: item.location ?? null,
    start_date: item.start_date ?? null,
    end_date: item.end_date ?? null,
    is_current: item.is_current ?? false,
    description: item.description ?? null,
  };
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

/** True if id is a synthetic parsed ID (parsed-we-0, parsed-edu-1, etc.), not a DB UUID */
function isParsedId(id: string): boolean {
  return /^parsed-/.test(id);
}

export default function WorkHistoryTimeline({
  candidateId,
  items = [],
  onUpdate,
  readOnly = false,
  activeFieldId = null,
  onFieldSelect,
}: WorkHistoryTimelineProps) {
  const isActive = activeFieldId === "experience";
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkHistoryPayload & { id?: string }>(
    emptyForm,
  );
  const [saving, setSaving] = useState(false);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: WorkHistory) => {
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
      const payload: WorkHistoryPayload = {
        client_name: form.client_name || null,
        company_name: form.company_name || null,
        job_title: form.job_title || null,
        location: form.location || null,
        start_date: form.start_date || null,
        end_date: form.is_current ? null : form.end_date || null,
        is_current: form.is_current ?? false,
        description: form.description || null,
      };
      if (editingId && !isParsedId(editingId)) {
        const updated = await updateWorkHistory(
          candidateId,
          editingId,
          payload,
        );
        onUpdate?.(updated.work_history ?? []);
        toast.success("Work history updated");
      } else {
        const updated = await createWorkHistory(candidateId, payload);
        onUpdate?.(updated.work_history ?? []);
        toast.success("Work history added");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (entry: WorkHistory) => {
      if (
        !window.confirm(
          "Remove this work history entry? This cannot be undone.",
        )
      )
        return;
      try {
        if (isParsedId(entry.id)) {
          const filtered = items.filter((i) => i.id !== entry.id);
          onUpdate?.(filtered);
          toast.success("Work history removed");
        } else {
          const updated = await deleteWorkHistory(candidateId, entry.id);
          onUpdate?.(updated.work_history ?? []);
          toast.success("Work history removed");
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
      onClick={() => onFieldSelect?.("experience")}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFieldSelect?.("experience");
      }}
      className={`rounded-lg border p-6 transition-all duration-200 ${
        isActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Work history</h2>
        {!readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openAdd();
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add Work History
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No work history available.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="relative pl-6">
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-brand-500" />
              {idx !== items.length - 1 && (
                <span className="absolute left-[5px] top-5 h-full w-px bg-slate-200" />
              )}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.job_title || "Role"} ·{" "}
                      {item.company_name || item.client_name || "Company"}
                      {item.location ? (
                        <span className="ml-2 whitespace-nowrap text-xs font-medium text-slate-500">
                          ({item.location})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.start_date || "—"} →{" "}
                      {item.is_current ? "Present" : item.end_date || "—"}
                    </p>
                    {item.description && (
                      <p className="mt-2 text-xs text-slate-600">
                        {item.description}
                      </p>
                    )}
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
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Work History" : "Add Work History"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Client Name
            </label>
            <input
              type="text"
              value={form.client_name ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, client_name: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. HIPAA And HITECH Security Requirements"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Company Name
            </label>
            <input
              type="text"
              value={form.company_name ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, company_name: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Humana"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Role / Job Title
            </label>
            <input
              type="text"
              value={form.job_title ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, job_title: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Senior Data Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              type="text"
              value={form.location ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Louisville, KY"
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
                disabled={form.is_current}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="wh-present"
              checked={form.is_current ?? false}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_current: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            <label htmlFor="wh-present" className="text-sm text-slate-700">
              Present (current role)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Project Description / Responsibilities
            </label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Describe responsibilities and achievements..."
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
