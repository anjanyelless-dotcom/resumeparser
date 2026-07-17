import { create } from "zustand";
import { toast } from "react-hot-toast";
import { api } from "../services/api";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "previewing"
  | "parsing"
  | "saving"
  | "success"
  | "duplicate"
  | "failed";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string | null;
  jobId?: string | null;
  uploadedAt?: string;
  duplicateError?: {
    message: string;
    field: string;
    existingCandidateId: string;
    existingCandidateName: string;
  } | null;
};

interface FailedFile {
  fileName: string;
  error: string;
}

interface DuplicateFile {
  fileName: string;
  message: string;
  field: string;
  existingCandidateId: string;
  existingCandidateName: string;
}

type UploadState = {
  queue: UploadItem[];
  activePreviewId: string | null;
  uploadComplete: boolean;
  summary: {
    totalUploaded: number;
    successful: number;
    duplicates: number;
    failed: number;
    failedFiles: FailedFile[];
    duplicateFiles: DuplicateFile[];
  };
  addFiles: (files: File[]) => UploadItem[];
  uploadAll: (model?: string) => Promise<void>;
  updateProgress: (id: string, progress: number) => void;
  setStatus: (id: string, status: UploadStatus) => void;
  setJobId: (id: string, jobId: string) => void;
  setError: (id: string, error: string) => void;
  setDuplicateError: (id: string, duplicateError: UploadItem["duplicateError"]) => void;
  setActivePreviewId: (id: string | null) => void;
  resetSummary: () => void;
  setUploadComplete: (complete: boolean) => void;
  clearQueue: () => void;
};

export const useUploadStore = create<UploadState>((set, get) => ({
  queue: [],
  activePreviewId: null,
  uploadComplete: false,
  summary: {
    totalUploaded: 0,
    successful: 0,
    duplicates: 0,
    failed: 0,
    failedFiles: [],
    duplicateFiles: [],
  },
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
  uploadAll: async (model = "own-model") => {
    console.log(`🚀 [BULK UPLOAD] Starting optimized bulk upload with model: ${model}`);
    const queue = get().queue.filter((item) => item.status === "queued");
    const totalUploaded = queue.length;
    if (totalUploaded === 0) return;

    set((state) => ({
      queue: state.queue.map((entry) =>
        queue.some((q) => q.id === entry.id)
          ? { ...entry, status: "uploading", progress: 10 }
          : entry
      ),
      summary: { ...state.summary, totalUploaded },
    }));

    const failedFiles: FailedFile[] = [];
    const duplicateFiles: DuplicateFile[] = [];

    try {
      const formData = new FormData();
      for (const item of queue) {
        formData.append("resumes", item.file);
      }
      formData.append("model", model);
      formData.append("force_ocr", "false");

      const response = await api.post(`/upload/bulk`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000, // 10 minutes for large bulk uploads
        onUploadProgress: (progressEvent) => {
          const percent = Math.min(
            30,
            Math.round((progressEvent.loaded * 30) / (progressEvent.total || progressEvent.loaded))
          );
          set((state) => ({
            queue: state.queue.map((entry) =>
              queue.some((q) => q.id === entry.id)
                ? { ...entry, progress: percent }
                : entry
            ),
          }));
        },
      });

      const data = response.data;
      interface BulkResult {
        fileName: string;
        status: "success" | "duplicate" | "failed";
        error?: string;
        duplicate?: {
          message: string;
          field: string;
          existingCandidateId?: string;
          existingCandidateName?: string | null;
        };
      }
      const resultsByName = new Map<string, BulkResult>(data.results.map((r: BulkResult) => [r.fileName, r]));

      for (const item of queue) {
        const result = resultsByName.get(item.file.name);
        if (!result) {
          get().setStatus(item.id, "failed");
          get().setError(item.id, "No response from server");
          failedFiles.push({ fileName: item.file.name, error: "No response" });
          continue;
        }

        if (result.status === "success") {
          get().updateProgress(item.id, 100);
          get().setStatus(item.id, "success");
        } else if (result.status === "duplicate") {
          get().setStatus(item.id, "duplicate");
          const dup = result.duplicate || { message: "Duplicate", field: "unknown" };
          get().setDuplicateError(item.id, {
            message: dup.message,
            field: dup.field,
            existingCandidateId: dup.existingCandidateId || "",
            existingCandidateName: dup.existingCandidateName || "",
          });
          duplicateFiles.push({
            fileName: item.file.name,
            message: dup.message,
            field: dup.field,
            existingCandidateId: dup.existingCandidateId || "",
            existingCandidateName: dup.existingCandidateName || "",
          });
        } else {
          get().setError(item.id, result.error || "Processing failed");
          get().setStatus(item.id, "failed");
          failedFiles.push({
            fileName: item.file.name,
            error: result.error || "Processing failed",
          });
        }
      }

      set(() => ({
        summary: {
          totalUploaded,
          successful: data.summary?.successful || 0,
          duplicates: data.summary?.duplicates || 0,
          failed: data.summary?.failed || 0,
          failedFiles,
          duplicateFiles,
        },
        uploadComplete: true,
      }));

      if (data.summary?.duplicates === 0 && data.summary?.failed === 0) {
        toast.success(`All ${data.summary.successful} resumes processed successfully!`);
      } else if (data.summary?.duplicates > 0 && data.summary?.failed === 0) {
        toast.error(`${data.summary.successful} saved, ${data.summary.duplicates} duplicate(s).`);
      } else {
        toast.error(`${data.summary.successful} saved, ${data.summary.duplicates} duplicate(s), ${data.summary.failed} failed.`);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Bulk upload failed";
      console.error(`❌ [BULK UPLOAD] ${message}`);
      for (const item of queue) {
        get().setError(item.id, message);
        get().setStatus(item.id, "failed");
        failedFiles.push({ fileName: item.file.name, error: message });
      }
      set(() => ({
        summary: { totalUploaded, successful: 0, duplicates: 0, failed: totalUploaded, failedFiles, duplicateFiles },
        uploadComplete: true,
      }));
      toast.error(`Bulk upload failed: ${message}`);
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
  setDuplicateError: (id, duplicateError) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, duplicateError } : item,
      ),
    })),
  resetSummary: () => set({
    uploadComplete: false,
    summary: {
      totalUploaded: 0,
      successful: 0,
      duplicates: 0,
      failed: 0,
      failedFiles: [],
      duplicateFiles: [],
    },
  }),
  setUploadComplete: (complete) => set({ uploadComplete: complete }),
  clearQueue: () => set({ queue: [] }),
}));
