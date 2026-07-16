import { useEffect, useState } from 'react';
import { LayoutGrid, Table } from 'lucide-react';

type ViewMode = 'grid' | 'table';

interface CandidateViewToggleProps {
  onViewChange?: (view: ViewMode) => void;
}

export default function CandidateViewToggle({ onViewChange }: CandidateViewToggleProps) {
  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('candidate_view');
    return saved === 'table' ? 'table' : 'grid';
  });

  useEffect(() => {
    localStorage.setItem('candidate_view', view);
    onViewChange?.(view);
  }, [view, onViewChange]);

  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => setView('grid')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          view === 'grid'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        Grid
      </button>
      <button
        onClick={() => setView('table')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          view === 'table'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Table className="w-4 h-4" />
        Table
      </button>
    </div>
  );
}
