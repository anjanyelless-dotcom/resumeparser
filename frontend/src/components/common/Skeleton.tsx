type SkeletonProps = {
  lines?: number;
  className?: string;
};

export default function Skeleton({ lines = 3, className = "" }: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={`skeleton-${idx}`}
          className="h-4 w-full animate-pulse rounded bg-slate-200"
        />
      ))}
    </div>
  );
}
