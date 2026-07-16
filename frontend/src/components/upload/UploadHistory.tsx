import type { UploadItem } from "../../store/uploadStore";

type UploadHistoryProps = {
  items: UploadItem[];
};

export default function UploadHistory({ items }: UploadHistoryProps) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">No uploads yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Recent uploads</h3>
      <div className="mt-4 space-y-3">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {item.file.name}
              </p>
              <p className="text-xs text-slate-500">
                {item.uploadedAt ?? "Just now"}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
