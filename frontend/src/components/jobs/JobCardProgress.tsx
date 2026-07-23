import React from 'react';
import type { Job } from '../../types/job';

interface JobCardProgressProps {
  job: Job;
}

export const JobCardProgress: React.FC<JobCardProgressProps> = ({ job }) => {
  const stage = job.current_recruitment_stage || "Pending";
  const progress = job.recruitment_progress_percentage || 0;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
      {/* Stage and Progress */}
      <div className="flex justify-between items-center text-sm mb-1">
        <div>
          <span className="text-gray-500 text-xs uppercase tracking-wider block">Current Stage</span>
          <span className="font-medium text-gray-900">{stage}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500 text-xs uppercase tracking-wider block">Progress</span>
          <span className="font-medium text-indigo-600">{progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
