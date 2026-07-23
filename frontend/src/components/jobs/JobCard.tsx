import React from 'react';
import type { Job, JobAction } from '../../types/job';
import { JobCardHeader } from './JobCardHeader';
import { JobCardSummary } from './JobCardSummary';
import { JobCardProgress } from './JobCardProgress';
import { JobCardAssignment } from './JobCardAssignment';
import { JobCardActions } from './JobCardActions';

export type JobCardVariant = "JOB" | "TEAM_LEAD" | "RECRUITER";

interface JobCardProps {
  job: Job;
  variant: JobCardVariant;
  
  // Callbacks
  onActionClick: (job: Job, action: JobAction) => void;
  onViewDetails: (job: Job) => void;
  onViewProgress: (job: Job) => void;
  onToggleStatus?: (job: Job) => void;
  onEditJob?: (job: Job) => void;
  onCopyLink?: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  variant,
  onActionClick,
  onViewDetails,
  onViewProgress,
  onToggleStatus,
  onEditJob,
  onCopyLink
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full">
      {/* Header (Always Visible) */}
      <JobCardHeader 
        job={job} 
        onToggleStatus={onToggleStatus ? () => onToggleStatus(job) : undefined} 
      />

      {/* Summary (Adapts based on variant) */}
      <JobCardSummary 
        job={job} 
        variant={variant} 
      />

      {/* Progress (Always Visible) */}
      <JobCardProgress 
        job={job} 
      />

      {/* Assignment (Adapts based on variant) */}
      <JobCardAssignment 
        job={job} 
        variant={variant} 
      />

      {/* Actions (Dynamic based on backend rules) */}
      <JobCardActions
        job={job}
        variant={variant}
        onActionClick={(action) => onActionClick(job, action)}
        onViewDetails={() => onViewDetails(job)}
        onViewProgress={() => onViewProgress(job)}
        onEditJob={onEditJob ? () => onEditJob(job) : undefined}
        onCopyLink={onCopyLink ? () => onCopyLink(job) : undefined}
      />
    </div>
  );
};
