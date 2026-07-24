import { useState } from "react";
import { Search, Copy, Download, X } from "lucide-react";

interface ExtractedTextViewerProps {
  rawText: string;
  onClose: () => void;
}

export default function ExtractedTextViewer({ rawText, onClose }: ExtractedTextViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const lines = rawText.split('\n');
  const filteredLines = searchQuery
    ? lines.map((line, index) => ({ line, index: index + 1 }))
        .filter(({ line }) => line.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines.map((line, index) => ({ line, index: index + 1 }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_extracted_text_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Extracted Resume Text</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search in text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          <div className="font-mono text-sm text-gray-100 whitespace-pre">
            {searchQuery ? (
              filteredLines.length > 0 ? (
                filteredLines.map(({ line, index }) => (
                  <div key={index} className="flex">
                    <span className="text-gray-500 w-16 flex-shrink-0 select-none">{index}</span>
                    <span className="flex-1">{line}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">No matches found for "{searchQuery}"</div>
              )
            ) : (
              lines.map((line, index) => (
                <div key={index} className="flex">
                  <span className="text-gray-500 w-16 flex-shrink-0 select-none">{index + 1}</span>
                  <span className="flex-1">{line || ' '}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          <span className="font-medium">{lines.length}</span> lines • <span className="font-medium">{rawText.length}</span> characters
          {searchQuery && filteredLines.length > 0 && (
            <span className="ml-4">• <span className="font-medium">{filteredLines.length}</span> matches</span>
          )}
        </div>
      </div>
    </div>
  );
}
