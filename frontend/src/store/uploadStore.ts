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
    console.log(`🚀 [BULK UPLOAD] Starting bulk upload process with model: ${model}`);
    const queue = get().queue;
    console.log(`📋 [BULK UPLOAD] Queue size: ${queue.length}`);
    const totalUploaded = queue.length;
    let successful = 0;
    let duplicates = 0;
    let failed = 0;
    const failedFiles: FailedFile[] = [];
    const duplicateFiles: DuplicateFile[] = [];

    set((state) => ({
      summary: {
        ...state.summary,
        totalUploaded,
      },
    }));

    for (const item of queue) {
      if (item.status !== "queued") continue;
      
      console.log(`📄 [BULK UPLOAD] Processing: ${item.file.name}`);
      
      // Set status to previewing
      set((state) => ({
        queue: state.queue.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "previewing", progress: 0 }
            : entry,
        ),
      }));

      try {
        // Step 1: Extract sections using preview-sections
        console.log(`🔍 [BULK UPLOAD] Step 1: Calling preview-sections for ${item.file.name}`);
        const formData = new FormData();
        formData.append("resume", item.file);
        formData.append("force_ocr", "false");

        const previewResponse = await api.post(
          `/upload/preview-sections`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        console.log(`✅ [BULK UPLOAD] Step 1 complete: preview-sections for ${item.file.name}`);
        get().updateProgress(item.id, 25);
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "parsing", progress: 25 }
              : entry,
          ),
        }));

        // Step 2: Parse sections using parse-sections
        console.log(`🤖 [BULK UPLOAD] Step 2: Calling parse-sections for ${item.file.name}`);
        const rawSections = previewResponse.data.sections || {};
        const parseResponse = await api.post(
          `/upload/parse-sections`,
          {
            model,
            experience_text: rawSections.experience?.text || "",
            education_text: rawSections.education?.text || "",
            skills_text: rawSections.skills?.text || "",
            summary_text: rawSections.summary?.text || "",
            certifications_text: rawSections.certifications?.text || "",
            projects_text: rawSections.projects?.text || "",
            contact_text: rawSections.contact?.text || "",
            raw_text: previewResponse.data.raw_text || "",
          }
        );

        console.log(`✅ [BULK UPLOAD] Step 2 complete: parse-sections for ${item.file.name}`);
        get().updateProgress(item.id, 50);
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "saving", progress: 50 }
              : entry,
          ),
        }));

        // Step 3: Validate candidate data
        console.log(`✓ [BULK UPLOAD] Step 3: Validating candidate data for ${item.file.name}`);
        const candidateName = parseResponse.data.contact?.name || "";
        const candidateEmail = parseResponse.data.contact?.email || "";
        const candidatePhone = parseResponse.data.contact?.phone || "";

        // Basic validation
        if (!candidateName && !candidateEmail && !candidatePhone) {
          throw new Error("No candidate information extracted (name, email, or phone required)");
        }

        console.log(`✓ [BULK UPLOAD] Step 3 complete: Validation passed for ${item.file.name}`);

        // Step 4 & 5: Save to database (duplicate check happens in backend)
        console.log(`💾 [BULK UPLOAD] Step 4: Saving candidate ${item.file.name} to database`);
        try {
          await api.post(`/candidates`, {
            ...parseResponse.data,
            email: candidateEmail,
            full_name: candidateName,
            phone: candidatePhone,
            linkedin_url: parseResponse.data.contact?.linkedin || "",
            github_url: parseResponse.data.contact?.github || "",
            summary: parseResponse.data.summary || "",
            raw_resume_text: previewResponse.data.raw_text || "",
            resume_file_path: item.file.name,
            original_filename: item.file.name,
            file_type: item.file.type,
          });

          console.log(`✅ [BULK UPLOAD] Step 4 complete: Candidate saved successfully ${item.file.name}`);
          get().updateProgress(item.id, 100);
          get().setStatus(item.id, "success");
          successful++;
          toast.success(`${item.file.name} saved successfully`);
        } catch (saveError: any) {
          // Check if it's a duplicate error
          if (saveError.response?.status === 409 && saveError.response?.data?.code === "DUPLICATE_CANDIDATE") {
            const duplicateData = saveError.response.data;
            console.log(`⚠️ [BULK UPLOAD] Duplicate detected for ${item.file.name}: ${duplicateData.message}`);
            
            // Mark as duplicate
            get().setStatus(item.id, "duplicate");
            get().setDuplicateError(item.id, {
              message: duplicateData.message,
              field: duplicateData.field,
              existingCandidateId: duplicateData.existingCandidateId,
              existingCandidateName: duplicateData.existingCandidateName,
            });
            
            duplicates++;
            duplicateFiles.push({
              fileName: item.file.name,
              message: duplicateData.message,
              field: duplicateData.field,
              existingCandidateId: duplicateData.existingCandidateId,
              existingCandidateName: duplicateData.existingCandidateName,
            });
            
            toast.error(`${item.file.name}: Duplicate candidate`);
          } else {
            // General save error
            const message = saveError.response?.data?.message || saveError.message || "Failed to save candidate";
            console.log(`❌ [BULK UPLOAD] Save failed for ${item.file.name}: ${message}`);
            get().setError(item.id, message);
            get().setStatus(item.id, "failed");
            failed++;
            failedFiles.push({
              fileName: item.file.name,
              error: message,
            });
            toast.error(`${item.file.name} failed: ${message}`);
          }
        }
      } catch (error: any) {
        // Error in preview or parse step
        const message = error.response?.data?.message || error.message || "Processing failed";
        console.log(`❌ [BULK UPLOAD] Processing failed for ${item.file.name}: ${message}`);
        get().setError(item.id, message);
        get().setStatus(item.id, "failed");
        failed++;
        failedFiles.push({
          fileName: item.file.name,
          error: message,
        });
        toast.error(`${item.file.name} failed: ${message}`);
      }
    }

    console.log(`🏁 [BULK UPLOAD] Bulk upload complete: ${successful} saved, ${duplicates} duplicates, ${failed} failed`);
    set((_state) => ({
      summary: {
        totalUploaded,
        successful,
        duplicates,
        failed,
        failedFiles,
        duplicateFiles,
      },
      uploadComplete: true,
    }));

    if (duplicates === 0 && failed === 0) {
      toast.success(`All ${successful} resumes processed successfully!`);
    } else if (duplicates > 0 && failed === 0) {
      toast.error(`${successful} saved, ${duplicates} duplicate(s). Check the summary for details.`);
    } else {
      toast.error(`${successful} saved, ${duplicates} duplicate(s), ${failed} failed. Check the summary for details.`);
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
