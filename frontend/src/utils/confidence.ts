export const confidenceTone = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "bg-slate-100 text-slate-600";
  }
  if (value >= 0.8) return "bg-emerald-50 text-emerald-700";
  if (value >= 0.6) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

export const confidenceLabel = (value?: number | null) => {
  if (value === null || value === undefined) return "N/A";
  return `${Math.round(value * 100)}%`;
};
