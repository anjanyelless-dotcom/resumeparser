import { useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";

type DragDropZoneProps = {
  onFilesSelected: (files: File[]) => void;
};

export default function DragDropZone({ onFilesSelected }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      onFilesSelected(Array.from(fileList));
    },
    [onFilesSelected],
  );

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
        isDragging
          ? "border-brand-400 bg-brand-50"
          : "border-slate-200 bg-white"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        type="file"
        className="hidden"
        multiple
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <UploadCloud className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        Drag & drop resumes here
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Supported formats: PDF, DOC, DOCX, TXT, RTF. Max 10MB each.
      </p>
      <span className="mt-4 text-sm font-medium text-brand-600">
        Browse files
      </span>
    </label>
  );
}
