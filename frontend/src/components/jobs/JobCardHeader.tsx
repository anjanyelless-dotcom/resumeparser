import React from 'react';
import type { Job } from '../../types/job';

interface JobCardHeaderProps {
  job: Job;
  onToggleStatus?: () => void;
}

export const JobCardHeader: React.FC<JobCardHeaderProps> = ({ job, onToggleStatus }) => {
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "on hold":
        return "bg-orange-100 text-orange-800";
      case "draft":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{job.title?.trim() || "Untitled Job"}</h3>
          {job.priority && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              job.priority.toLowerCase() === 'critical' ? 'bg-red-100 text-red-800' :
              job.priority.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {job.priority}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 flex items-center gap-2">
          {job.department?.trim() || "No Department"}
          <span className="text-gray-300">•</span>
          <span className="font-medium" title={job.job_health_indicator}>
            {job.job_health_indicator || "Good"}
          </span>
        </p>
      </div>
      <button
        onClick={onToggleStatus}
        className={`px-2 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer hover:opacity-80 ${getStatusColor(job.status)}`}
        title="Click to toggle status"
      >
        {job.status}
      </button>
    </div>
  );
};
