import { create } from 'zustand';

interface RecruiterContextState {
  currentRequirementId: string | null;
  currentRequirementTitle: string | null;
  currentClientName: string | null;
  currentPriority: string | null;
  currentDueDate: string | null;
  setCurrentRequirement: (req: {
    id: string;
    title: string;
    clientName: string;
    priority?: string;
    dueDate?: string;
  }) => void;
  clearCurrentRequirement: () => void;
}

export const useRecruiterContextStore = create<RecruiterContextState>((set) => ({
  currentRequirementId: null,
  currentRequirementTitle: null,
  currentClientName: null,
  currentPriority: null,
  currentDueDate: null,
  setCurrentRequirement: (req) =>
    set({
      currentRequirementId: req.id,
      currentRequirementTitle: req.title,
      currentClientName: req.clientName,
      currentPriority: req.priority || null,
      currentDueDate: req.dueDate || null,
    }),
  clearCurrentRequirement: () =>
    set({
      currentRequirementId: null,
      currentRequirementTitle: null,
      currentClientName: null,
      currentPriority: null,
      currentDueDate: null,
    }),
}));
