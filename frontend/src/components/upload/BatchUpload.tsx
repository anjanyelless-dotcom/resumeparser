import Button from "../common/Button";
import UploadProgress from "./UploadProgress";
import type { UploadItem } from "../../store/uploadStore";

type BatchUploadProps = {
  queue: UploadItem[];
  onUpload: () => void;
};

const statusLabel: Record<string, string> = {
  queued: "Queued",
  uploading: "Uploading",
  processing: "Processing",
  success: "Completed",
  failed: "Failed",
};

export default function BatchUpload({ queue, onUpload }: BatchUploadProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Upload queue</h3>
          <p className="text-sm text-slate-600">
            {queue.length} file(s) selected
          </p>
        </div>
        <Button onClick={onUpload} disabled={!queue.length}>
          Upload all
        </Button>
      </div>

      <div className="space-y-3">
        {queue.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{item.file.name}</p>
                <p className="text-xs text-slate-500">
                  {item.file.type || "file"}
                </p>
              </div>
              <span
                className={`text-xs font-semibold ${
                  item.status === "failed"
                    ? "text-red-600"
                    : item.status === "success"
                      ? "text-emerald-600"
                      : "text-slate-500"
                }`}
              >
                {statusLabel[item.status]}
              </span>
            </div>
            <div className="mt-3">
              <UploadProgress
                progress={item.progress}
                status={statusLabel[item.status]}
              />
            </div>
            {item.error && (
              <p className="mt-2 text-xs text-red-600">{item.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
