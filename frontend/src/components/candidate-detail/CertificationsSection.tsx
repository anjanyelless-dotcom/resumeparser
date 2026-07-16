import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import type { Certification } from "../../types";
import Modal from "../common/Modal";
import {
  createCertification,
  updateCertification,
  deleteCertification,
  type CertificationPayload,
} from "../../services/api/candidates";

type CertificationsSectionProps = {
  candidateId: string;
  items?: Certification[] | null;
  rawContent?: string | null;
  onUpdate?: (updated: Certification[]) => void;
  readOnly?: boolean;
};

const isExpired = (expiryDate?: string | null) => {
  if (!expiryDate) return false;
  const date = new Date(expiryDate);
  if (isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
};

const parseFallbackItems = (
  rawContent: string | null | undefined,
): Array<{ id: string; name: string }> => {
  const raw = (rawContent ?? "").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[•\-\*\u2022]+\s*/u, "").trim())
    .filter(Boolean)
    .filter((line) => line.length <= 250)
    .map((name, idx) => ({ id: `fallback-${idx}`, name }));
};

const emptyForm: CertificationPayload & { id?: string } = {
  name: "",
  issuing_organization: "",
  issue_date: "",
  expiry_date: "",
  credential_id: "",
};

function toPayload(item: Partial<Certification>): CertificationPayload {
  return {
    name: item.name ?? "",
    issuing_organization: item.issuing_organization ?? null,
    issue_date: item.issue_date ?? null,
    expiry_date: item.expiry_date ?? null,
    credential_id: item.credential_id ?? null,
  };
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

/** True if id is a synthetic ID (parsed-cert-0, fallback-0, etc.), not a DB UUID */
function isParsedId(id: string): boolean {
  return /^(parsed|fallback)-/.test(id);
}

export default function CertificationsSection({
  candidateId,
  items = [],
  rawContent,
  onUpdate,
  readOnly = false,
}: CertificationsSectionProps) {
  const safeItems = items ?? [];
  const fallback = safeItems.length === 0 ? parseFallbackItems(rawContent) : [];
  const displayItems = safeItems.length > 0 ? safeItems : fallback;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CertificationPayload & { id?: string }>(
    emptyForm,
  );
  const [saving, setSaving] = useState(false);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: Certification) => {
    setEditingId(item.id);
    setForm({
      ...toPayload(item),
      id: item.id,
      issue_date: formatDate(item.issue_date) || undefined,
      expiry_date: formatDate(item.expiry_date) || undefined,
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
    if (!(form.name ?? "").trim()) {
      toast.error("Certification name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: CertificationPayload = {
        name: (form.name ?? "").trim(),
        issuing_organization: form.issuing_organization || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        credential_id: form.credential_id || null,
      };
      if (editingId && !isParsedId(editingId)) {
        const updated = await updateCertification(
          candidateId,
          editingId,
          payload,
        );
        onUpdate?.(updated.certifications ?? []);
        toast.success("Certification updated");
      } else {
        const updated = await createCertification(candidateId, payload);
        onUpdate?.(updated.certifications ?? []);
        toast.success("Certification added");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (entry: Certification) => {
      if (!window.confirm("Remove this certification? This cannot be undone."))
        return;
      try {
        if (isParsedId(entry.id)) {
          const filtered = displayItems.filter((i) => i.id !== entry.id);
          onUpdate?.(filtered);
          toast.success("Certification removed");
        } else {
          const updated = await deleteCertification(candidateId, entry.id);
          onUpdate?.(updated.certifications ?? []);
          toast.success("Certification removed");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    },
    [candidateId, displayItems, onUpdate],
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
        {!readOnly && (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add Certification
          </button>
        )}
      </div>

      {safeItems.length === 0 && fallback.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No certifications.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {safeItems.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {cert.name}
                </p>
                <p className="text-xs text-slate-500">
                  {cert.issuing_organization || "Issuer"}
                </p>
                <p className="text-xs text-slate-500">
                  {cert.issue_date || "—"} → {cert.expiry_date || "No expiry"}
                  {cert.credential_id && (
                    <span className="ml-2">· ID: {cert.credential_id}</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isExpired(cert.expiry_date)
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isExpired(cert.expiry_date) ? "Expired" : "Active"}
                </span>
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(cert)}
                      className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cert)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {safeItems.length === 0 &&
            fallback.map((cert) => (
              <div key={cert.id} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {cert.name}
                </p>
              </div>
            ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Certification" : "Add Certification"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Certification Name *
            </label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. AWS Certified Data Analytics"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Organization
            </label>
            <input
              type="text"
              value={form.issuing_organization ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  issuing_organization: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Amazon Web Services"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Issue Date
              </label>
              <input
                type="date"
                value={form.issue_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issue_date: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                value={form.expiry_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiry_date: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Credential ID (optional)
            </label>
            <input
              type="text"
              value={form.credential_id ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, credential_id: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. ABC123XYZ"
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
