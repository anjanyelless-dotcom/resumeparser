import { FileText } from "lucide-react";

type ResumePreviewSectionProps = {
  /** Blob URL for PDF preview */
  pdfUrl?: string | null;
  /** Rendered HTML for DOCX preview */
  docxHtml?: string | null;
  /** Error message when preview unavailable */
  error?: string | null;
  /** Document filename for display */
  filename?: string;
  /** Hide the header bar */
  hideHeader?: boolean;
};

export default function ResumePreviewSection({
  pdfUrl,
  docxHtml,
  error,
  filename,
  hideHeader,
}: ResumePreviewSectionProps) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-[calc(100vh-12rem)]">
      {/* Header */}
      {!hideHeader && (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="truncate text-sm font-medium text-slate-700">
              {filename || "Resume"}
            </span>
          </div>
        </div>
      )}

      {/* Preview content - scrollable, full height */}
      <div className="min-h-0 flex-1 overflow-auto">
        {error && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-slate-500">{error}</p>
            <p className="mt-1 text-xs text-slate-400">
              Use Download to save the file.
            </p>
          </div>
        )}

        {!error && docxHtml && (
          <div className="bg-slate-50/50 p-4 min-h-full">
            <div className="elegant-resume-page">
              <div
                className="elegant-resume-preview"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          </div>
        )}

        {!error && pdfUrl && (
          <iframe
            src={pdfUrl}
            className="h-full min-h-[600px] w-full border-0"
            title="Resume preview"
          />
        )}

        {!error && !pdfUrl && !docxHtml && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Loading preview…</p>
          </div>
        )}
      </div>
    </div>
  );
}
