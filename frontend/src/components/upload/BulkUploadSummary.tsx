import { CheckCircle, XCircle, AlertCircle, Download, FileText, Users } from "lucide-react";

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

interface BulkUploadSummaryProps {
  totalUploaded: number;
  successful: number;
  duplicates: number;
  failed: number;
  failedFiles: FailedFile[];
  duplicateFiles: DuplicateFile[];
  onDismiss?: () => void;
  onDownloadFailed?: () => void;
  onDownloadDuplicates?: () => void;
  onViewDuplicate?: (duplicateFile: DuplicateFile) => void;
}

export default function BulkUploadSummary({
  totalUploaded,
  successful,
  duplicates,
  failed,
  failedFiles,
  duplicateFiles,
  onDismiss,
  onDownloadFailed,
  onDownloadDuplicates,
  onViewDuplicate,
}: BulkUploadSummaryProps) {
  const successRate = totalUploaded > 0 ? ((successful / totalUploaded) * 100).toFixed(1) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Bulk Upload Complete
              </h3>
              <p className="text-sm text-slate-600">
                Processing finished for {totalUploaded} resume(s)
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {/* Total Uploaded */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <Download className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalUploaded}</p>
              <p className="text-xs text-slate-600">Total Uploaded</p>
            </div>
          </div>
        </div>

        {/* Successful */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{successful}</p>
              <p className="text-xs text-green-700">Successfully Saved</p>
            </div>
          </div>
        </div>

        {/* Duplicates */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900">{duplicates}</p>
              <p className="text-xs text-amber-700">Duplicates</p>
            </div>
          </div>
        </div>

        {/* Failed */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-200">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-900">{failed}</p>
              <p className="text-xs text-red-700">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Success Rate</span>
          <span className="text-sm font-bold text-slate-900">{successRate}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* Duplicate Files List */}
      {duplicates > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900">
                Duplicate Files ({duplicates})
              </h4>
            </div>
            {onDownloadDuplicates && (
              <button
                onClick={onDownloadDuplicates}
                className="text-sm font-medium text-amber-600 hover:text-amber-800"
              >
                Download List
              </button>
            )}
          </div>
          <div className="space-y-2">
            {duplicateFiles.map((file, index) => (
              <div
                key={index}
                className="rounded border border-amber-200 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{file.fileName}</p>
                    <p className="text-xs text-amber-600">{file.message}</p>
                    <p className="text-xs text-slate-500">
                      Duplicate field: {file.field} | Existing: {file.existingCandidateName}
                    </p>
                  </div>
                  {onViewDuplicate && (
                    <button
                      onClick={() => onViewDuplicate(file)}
                      className="ml-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md bg-amber-100 p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Duplicate candidates were not saved to the database. 
              You can review the details above and decide how to handle them.
            </p>
          </div>
        </div>
      )}

      {/* Failed Files List */}
      {failed > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-900">
                Failed Files ({failed})
              </h4>
            </div>
            {onDownloadFailed && (
              <button
                onClick={onDownloadFailed}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Download List
              </button>
            )}
          </div>
          <div className="space-y-2">
            {failedFiles.map((file, index) => (
              <div
                key={index}
                className="rounded border border-red-200 bg-white p-3"
              >
                <p className="text-sm font-medium text-slate-900">{file.fileName}</p>
                <p className="text-xs text-red-600">{file.error}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md bg-red-100 p-3">
            <p className="text-xs text-red-800">
              <strong>Note:</strong> Failed files were not saved to the database. 
              You can review the failed files above and re-upload them after fixing the issues.
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {duplicates === 0 && failed === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-900">
              All resumes processed successfully! {successful} candidate(s) saved to the database.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}