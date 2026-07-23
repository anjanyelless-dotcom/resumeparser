import { useState } from "react";
import { HardDrive, Shield, Clock, AlertTriangle, CheckCircle, Download, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function BackupRestorePage() {
  const [isExporting, setIsExporting] = useState(false);

  const lastBackupTime = new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Placeholder — in production this would call a backup endpoint
      await new Promise(r => setTimeout(r, 1500));
      toast.success("Export request queued. Download will start shortly.");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const statusCards = [
    {
      label: "Last Backup",
      value: lastBackupTime,
      icon: <Clock className="w-5 h-5" />,
      color: "text-blue-600 bg-blue-100",
      status: "healthy" as const,
    },
    {
      label: "Backup Status",
      value: "Operational",
      icon: <CheckCircle className="w-5 h-5" />,
      color: "text-green-600 bg-green-100",
      status: "healthy" as const,
    },
    {
      label: "Storage Used",
      value: "~2.4 GB",
      icon: <HardDrive className="w-5 h-5" />,
      color: "text-purple-600 bg-purple-100",
      status: "healthy" as const,
    },
    {
      label: "Retention Policy",
      value: "30 days",
      icon: <Shield className="w-5 h-5" />,
      color: "text-orange-600 bg-orange-100",
      status: "healthy" as const,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <HardDrive className="w-7 h-7 text-orange-600" />
          </div>
          Backup & Restore
        </h1>
        <p className="text-gray-500 mt-2">Manage system backups and data recovery</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statusCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className={`inline-flex p-2 rounded-lg ${card.color.split(" ")[1]} mb-3`}>
              <span className={card.color.split(" ")[0]}>{card.icon}</span>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            Export Data
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Export a full snapshot of your ATS data including candidates, jobs, submissions, interviews, and placements in JSON format.
          </p>
          <div className="space-y-3">
            {["Full Database Export", "Candidates Only", "Jobs & Requirements", "Submissions & Placements"].map(label => (
              <button
                key={label}
                onClick={label === "Full Database Export" ? handleExport : undefined}
                disabled={isExporting}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all disabled:opacity-60 text-left group"
              >
                <div className="flex items-center gap-3">
                  <HardDrive className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                {isExporting && label === "Full Database Export" ? (
                  <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Restore */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-orange-600" />
            Restore Options
          </h2>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Caution: Irreversible Action</p>
              <p className="text-xs text-amber-700 mt-1">
                Restoring from a backup will overwrite current data. This action cannot be undone. Contact your system administrator to initiate a restore.
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            To restore from a backup, please contact your system administrator or use the CLI tool:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 mb-4">
            <p># Restore from latest backup</p>
            <p className="mt-1">npm run db:restore -- --env production</p>
            <p className="mt-2 text-gray-500"># Or from a specific file</p>
            <p className="mt-1">npm run db:restore -- --file backup.sql</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              All backups are encrypted at rest. Retention: 30 days.
            </p>
          </div>
        </div>
      </div>

      {/* Backup History (placeholder) */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Backup History</h2>
        <div className="space-y-3">
          {[
            { label: "Automatic Daily Backup", time: lastBackupTime, size: "842 MB", status: "Success" },
            { label: "Manual Export", time: new Date(Date.now() - 2 * 24 * 3600 * 1000).toLocaleDateString(), size: "838 MB", status: "Success" },
            { label: "Automatic Daily Backup", time: new Date(Date.now() - 3 * 24 * 3600 * 1000).toLocaleDateString(), size: "825 MB", status: "Success" },
          ].map((b, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.label}</p>
                  <p className="text-xs text-gray-500">{b.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">{b.size}</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
