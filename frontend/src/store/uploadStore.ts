import { create } from "zustand";
import { toast } from "react-hot-toast";
import { uploadResume, fetchJobStatus } from "../services/api/uploads";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "success"
  | "failed";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string | null;
  jobId?: string | null;
  uploadedAt?: string;
};

type UploadState = {
  queue: UploadItem[];
  activePreviewId: string | null;
  addFiles: (files: File[]) => UploadItem[];
  uploadAll: () => Promise<void>;
  updateProgress: (id: string, progress: number) => void;
  setStatus: (id: string, status: UploadStatus) => void;
  setJobId: (id: string, jobId: string) => void;
  setError: (id: string, error: string) => void;
  pollStatuses: () => Promise<void>;
  setActivePreviewId: (id: string | null) => void;
};

export const useUploadStore = create<UploadState>((set, get) => ({
  queue: [],
  activePreviewId: null,
  addFiles: (files) => {
    // ... items added
    const newItems = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "queued" as UploadStatus,
      progress: 0,
      error: null,
    }));

    set((state) => ({
      queue: [...state.queue, ...newItems],
    }));

    return newItems; // Return new items so caller can set active preview
  },
  setActivePreviewId: (id) => set({ activePreviewId: id }),
  uploadAll: async () => {
    const queue = get().queue;
    for (const item of queue) {
      if (item.status !== "queued") continue;
      set((state) => ({
        queue: state.queue.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "uploading", progress: 0 }
            : entry,
        ),
      }));
      try {
        const jobId = await uploadResume(item.file, (progress) =>
          get().updateProgress(item.id, progress),
        );
        get().setJobId(item.id, jobId);
        if (import.meta.env.DEV) {
          console.log(
            "[DATA-LOSS CHECK] File upload stage — file sent to backend:",
            {
              fileName: item.file.name,
              fileSize: item.file.size,
              jobId,
            },
          );
        }
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "processing",
                  uploadedAt: new Date().toLocaleString(),
                }
              : entry,
          ),
        }));
        toast.success(`${item.file.name} uploaded`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        get().setError(item.id, message);
        get().setStatus(item.id, "failed");
        toast.error(`${item.file.name} failed: ${message}`);
      }
    }
  },
  updateProgress: (id, progress) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, progress } : item,
      ),
    })),
  setStatus: (id, status) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    })),
  setJobId: (id, jobId) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, jobId } : item,
      ),
    })),
  setError: (id, error) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, error } : item,
      ),
    })),
  pollStatuses: async () => {
    const queue = get().queue;
    const processing = queue.filter((item) => item.status === "processing");
    await Promise.all(
      processing.map(async (item) => {
        if (!item.jobId) return;
        try {
          const status = await fetchJobStatus(item.jobId);
          if (status === "success") {
            if (import.meta.env.DEV) {
              console.log(
                "[DATA-LOSS CHECK] Processing complete — job finished successfully:",
                {
                  jobId: item.jobId,
                  fileName: item.file.name,
                },
              );
            }
            get().updateProgress(item.id, 100);
            get().setStatus(item.id, "success");
          } else if (status === "failed") {
            get().setStatus(item.id, "failed");
          }
        } catch {
          return;
        }
      }),
    );
  },
}));
