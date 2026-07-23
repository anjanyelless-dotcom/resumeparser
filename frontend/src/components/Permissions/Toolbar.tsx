import React, { useState } from 'react';
import { Search, Copy, RotateCcw } from 'lucide-react';
import { usePermissionStore, type Role } from '../../store/usePermissionStore';

interface ToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onReset: () => void;
  onCopyFrom: (sourceRoleId: string) => void;
  isSuperAdmin: boolean;
  currentRoleId: string | null;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  onReset,
  onCopyFrom,
  isSuperAdmin,
  currentRoleId,
}) => {
  const { roles } = usePermissionStore();
  const [copySourceId, setCopySourceId] = useState('');

  const otherRoles: Role[] = roles.filter((r) => r.id !== currentRoleId);

  const handleClone = () => {
    if (copySourceId) {
      onCopyFrom(copySourceId);
    }
  };

  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Copy from role */}
          {!isSuperAdmin && otherRoles.length > 0 && (
            <div className="flex items-center space-x-1">
              <select
                value={copySourceId}
                onChange={(e) => setCopySourceId(e.target.value)}
                className="block py-2 pl-2 pr-7 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Copy from role...</option>
                {otherRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={handleClone}
                disabled={!copySourceId}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Clone</span>
              </button>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={isSuperAdmin}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
