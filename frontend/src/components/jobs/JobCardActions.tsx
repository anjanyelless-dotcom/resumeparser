import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { Job, JobAction } from '../../types/job';

interface JobCardActionsProps {
  job: Job;
  variant: "JOB" | "TEAM_LEAD" | "RECRUITER";
  onActionClick: (action: JobAction) => void;
  onViewDetails: () => void;
  onViewProgress: () => void;
  onEditJob?: () => void;
  onCopyLink?: () => void;
}

export const JobCardActions: React.FC<JobCardActionsProps> = ({
  job,
  variant,
  onActionClick,
  onViewDetails,
  onViewProgress,
  onEditJob,
  onCopyLink
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const allActions = job.available_actions || [];

  let allowedActionIds: string[] = [];
  if (variant === "JOB") {
    allowedActionIds = ["tl_assign", "edit_job", "close_job", "view_progress"];
  } else if (variant === "TEAM_LEAD") {
    allowedActionIds = ["tl_assign", "tl_reassign", "tl_remove"];
  } else if (variant === "RECRUITER") {
    allowedActionIds = ["rec_assign", "rec_manage", "rec_assign_additional"];
  }

  let primaryActions = allActions.filter(a => (a.type === "PRIMARY" || a.type === "DANGER") && allowedActionIds.includes(a.id));
  let secondaryActions = allActions.filter(a => a.type === "SECONDARY" && allowedActionIds.includes(a.id));

  let cardFaceSecondaryActions: JobAction[] = [];
  if (variant === "RECRUITER") {
    // Extract actions from dropdown to card face
    cardFaceSecondaryActions = secondaryActions.filter(a => ["rec_manage", "rec_assign_additional"].includes(a.id));
    secondaryActions = secondaryActions.filter(a => !["rec_manage", "rec_assign_additional"].includes(a.id));
    
    // Manage Recruiters should look like a primary button on the card face
    const recManage = cardFaceSecondaryActions.find(a => a.id === "rec_manage");
    if (recManage) {
        primaryActions.push(recManage);
        cardFaceSecondaryActions = cardFaceSecondaryActions.filter(a => a.id !== "rec_manage");
    }
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto relative">
      {/* Primary Actions (Left side) */}
      <div className="flex gap-2 flex-wrap">
        {primaryActions.map((action) => (
          <button 
            key={action.id}
            onClick={() => onActionClick(action)}
            disabled={!action.enabled}
            title={!action.enabled && action.message ? action.message : ""}
            className={`text-sm font-medium flex items-center px-4 py-2 rounded-md transition-colors border shadow-sm ${
              action.enabled 
                ? action.type === "DANGER"
                  ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                  : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" 
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
          >
            {action.label}
          </button>
        ))}
        {cardFaceSecondaryActions.map((action) => (
          <button 
            key={action.id}
            onClick={() => onActionClick(action)}
            disabled={!action.enabled}
            title={!action.enabled && action.message ? action.message : ""}
            className={`text-sm font-medium flex items-center px-4 py-2 rounded-md transition-colors border shadow-sm ${
              action.enabled 
                ? "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
      
      {/* Universal More Actions (Right side) */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 divide-y divide-gray-100 overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => { onViewDetails(); setDropdownOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  View Details
                </button>
                <button
                  onClick={() => { onViewProgress(); setDropdownOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  View Progress
                </button>
              </div>
              
              {/* Dynamic Secondary Actions */}
              {secondaryActions.length > 0 && (
                <div className="py-1">
                  {secondaryActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => { onActionClick(action); setDropdownOpen(false); }}
                      disabled={!action.enabled}
                      className={`block w-full text-left px-4 py-2 text-sm ${action.enabled ? "text-gray-700 hover:bg-gray-100" : "text-gray-400 cursor-not-allowed"}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Optional Standard Actions */}
              {((onEditJob && variant === "JOB") || onCopyLink) && (
                <div className="py-1">
                  {onEditJob && variant === "JOB" && (
                    <button
                      onClick={() => { onEditJob(); setDropdownOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit Job
                    </button>
                  )}
                  {onCopyLink && (
                    <button
                      onClick={() => { onCopyLink(); setDropdownOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Copy Job Link
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
