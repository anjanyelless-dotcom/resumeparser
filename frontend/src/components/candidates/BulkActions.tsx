import Button from "../common/Button";
import { exportCandidatesCsv } from "../../utils/csv";
import type { Candidate } from "../../types/candidate";

type BulkActionsProps = {
  selectedIds: Set<string>;
  candidates: Candidate[];
  onDelete: () => void;
};

export default function BulkActions({
  selectedIds,
  candidates,
  onDelete,
}: BulkActionsProps) {
  const selected = candidates.filter((candidate) =>
    selectedIds.has(candidate.id),
  );
  if (!selected.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">
        {selected.length} selected
      </span>
      <Button onClick={() => exportCandidatesCsv(selected)} variant="secondary">
        Export CSV
      </Button>
      <Button onClick={onDelete} variant="danger">
        Delete
      </Button>
    </div>
  );
}
