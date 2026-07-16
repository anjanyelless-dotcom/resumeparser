import { create } from "zustand";
import { toast } from "react-hot-toast";
import type { Candidate } from "../types/candidate";
import { fetchCandidates, deleteCandidate } from "../services/api/candidates";

let latestCandidatesRequestId = 0;

const isAbortError = (error: unknown) => {
  if (!error) return false;
  if (typeof error === "string") return /cancell?ed|aborted/i.test(error);
  if (error instanceof Error) return /cancell?ed|aborted/i.test(error.message);
  return false;
};

type SortDirection = "asc" | "desc";

type CandidateState = {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  sortKey: keyof Candidate;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (key: keyof Candidate) => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  selectAll: (ids: string[]) => void;
  loadCandidates: (signal?: AbortSignal) => Promise<void>;
  removeCandidates: (ids: string[]) => Promise<void>;
};

export const useCandidateStore = create<CandidateState>((set, get) => ({
  candidates: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 10,
  sortKey: "created_at",
  sortDirection: "desc",
  selectedIds: new Set(),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setSort: (key) =>
    set((state) => ({
      sortKey: key,
      sortDirection:
        state.sortKey === key && state.sortDirection === "asc" ? "desc" : "asc",
    })),
  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),
  clearSelected: () => set({ selectedIds: new Set() }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  loadCandidates: async (signal) => {
    const requestId = (latestCandidatesRequestId += 1);
    set({ loading: true, error: null });
    try {
      const data = await fetchCandidates(signal);
      if (requestId !== latestCandidatesRequestId) return;
      set({ candidates: data, loading: false });
    } catch (error) {
      if (requestId !== latestCandidatesRequestId) return;
      if (isAbortError(error)) {
        set({ loading: false });
        return;
      }
      set({
        error:
          error instanceof Error ? error.message : "Failed to load candidates",
        loading: false,
      });
    }
  },
  removeCandidates: async (ids) => {
    const current = get().candidates;
    set({ candidates: current.filter((item) => !ids.includes(item.id)) });
    try {
      await Promise.all(ids.map((id) => deleteCandidate(id)));
      toast.success("Candidates deleted");
      set({ selectedIds: new Set() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  },
}));
