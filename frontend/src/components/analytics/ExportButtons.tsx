import React, { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';

interface ExportButtonsProps {
  dateRange: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ dateRange }) => {
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);

  const handleExportCSV = async () => {
    try {
      setIsExporting('csv');
      const blob = await analyticsService.exportAnalyticsCSV(dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange}-days.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting('pdf');
      const blob = await analyticsService.exportAnalyticsPDF(dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange}-days.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleExportCSV}
        disabled={isExporting !== null}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isExporting === 'csv' ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </>
        )}
      </button>

      <button
        onClick={handleExportPDF}
        disabled={isExporting !== null}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isExporting === 'pdf' ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Export PDF
          </>
        )}
      </button>
    </div>
  );
};

export default ExportButtons;
