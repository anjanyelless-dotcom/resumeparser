import { useEffect, useState, useMemo } from "react";
import * as mammoth from "mammoth";
import { FileText, X } from "lucide-react";
import ResumePreviewSection from "../candidate-detail/ResumePreviewSection";

interface InlineScanningViewProps {
  file: File;
  isProcessing: boolean;
  onClose: () => void;
}

export default function InlineScanningView({
  file,
  isProcessing,
  onClose,
}: InlineScanningViewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filename = file.name;
  const ext = useMemo(
    () => filename.split(".").pop()?.toLowerCase() || "",
    [filename],
  );

  useEffect(() => {
    let active = true;
    const loadPreview = async () => {
      try {
        if (ext === "doc") {
          setError("Preview not supported for this file type.");
          return;
        }

        if (ext === "docx") {
          const buf = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (active) setDocxHtml(result.value);
          return;
        }

        if (ext === "pdf") {
          const url = URL.createObjectURL(file);
          if (active) setPdfUrl(url);
          return;
        }

        setError("Preview unavailable for this format.");
      } catch (err) {
        if (active) setError("Failed to load preview.");
      }
    };

    loadPreview();
    return () => {
      active = false;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [file, ext]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Visual Header from Image */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          {/* Blue Icon */}
          <div className="bg-brand-500 p-2.5 rounded-xl flex items-center justify-center shadow-md">
            <FileText className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>

          {/* File Info */}
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-slate-900 leading-tight">
              {filename}
            </h3>
            <span className="text-[10px] font-bold tracking-widest text-brand-600 uppercase mt-0.5">
              AI Extraction Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Processing Badge */}
          <div className="flex items-center bg-[#334155] text-white px-4 py-1.5 rounded-full shadow-inner">
            <div className="w-2 h-2 rounded-full bg-brand-400 mr-2.5 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase">
              Processing
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content with Scanning Animation */}
      <div className="relative flex-1 min-h-0 bg-slate-50/30 overflow-hidden">
        <div className="h-full overflow-auto">
          <ResumePreviewSection
            pdfUrl={pdfUrl}
            docxHtml={docxHtml}
            error={error}
            filename={filename}
            hideHeader={true}
          />
        </div>

        {/* Scanning Animation Overlay */}
        {isProcessing && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {/* The Scanning Line */}
            <div
              className="absolute top-0 h-full w-[2px] bg-brand-400 shadow-[0_0_20px_4px_rgba(37,99,235,0.4)] animate-scan"
              style={{ left: "-10%" }}
            >
              {/* Soft Glow following the line */}
              <div className="absolute left-[-150px] top-0 h-full w-[150px] bg-gradient-to-r from-transparent to-brand-400/10" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
