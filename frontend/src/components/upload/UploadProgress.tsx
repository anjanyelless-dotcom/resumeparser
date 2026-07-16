type UploadProgressProps = {
  progress: number;
  status: string;
};

export default function UploadProgress({
  progress,
  status,
}: UploadProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{status}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
