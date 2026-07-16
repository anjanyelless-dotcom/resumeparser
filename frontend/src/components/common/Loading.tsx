interface LoadingProps {
  label?: string;
}

export default function Loading({ label = "Loading..." }: LoadingProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      <span>{label}</span>
    </div>
  );
}
