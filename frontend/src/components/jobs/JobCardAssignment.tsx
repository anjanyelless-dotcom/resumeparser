import React from 'react';
import type { Job } from '../../types/job';

interface JobCardAssignmentProps {
  job: Job;
  variant: "JOB" | "TEAM_LEAD" | "RECRUITER";
}

export const JobCardAssignment: React.FC<JobCardAssignmentProps> = ({ job, variant }) => {
  if (variant === "JOB") {
    return (
      <div className="flex justify-between items-center text-sm mt-3 mb-2 bg-gray-50 p-3 rounded border border-gray-100">
        <div>
          <span className="text-gray-500 text-xs block">Team Lead</span>
          <span className="font-medium text-gray-900">{job.team_lead_name || "Unassigned"}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500 text-xs block">Recruiters</span>
          <span className="font-medium text-gray-900">{job.recruiters_assigned_count || 0}</span>
        </div>
      </div>
    );
  }

  if (variant === "TEAM_LEAD") {
    return (
      <div className="flex justify-between items-center text-sm mt-3 mb-2 bg-gray-50 p-3 rounded border border-gray-100">
        <div>
          <span className="text-gray-500 text-xs block">Assigned Team Lead</span>
          <span className="font-medium text-gray-900">{job.team_lead_name || "Unassigned"}</span>
        </div>
        {job.team_lead_name && job.team_lead_assigned_at && (
          <div className="text-right">
            <span className="text-gray-500 text-xs block">Assigned Date</span>
            <span className="font-medium text-gray-900">
              {new Date(job.team_lead_assigned_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === "RECRUITER") {
    return (
      <div className="flex flex-col text-sm mt-3 mb-2 bg-gray-50 p-3 rounded border border-gray-100 gap-3">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-gray-500 text-xs block">Team Lead</span>
            <span className="font-medium text-gray-900">{job.team_lead_name || "Unassigned"}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 text-xs block">Target Openings</span>
            <span className="font-medium text-indigo-600">{job.number_of_openings || job.total_openings || 0}</span>
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
          <div>
            <span className="text-gray-500 text-xs block">Recruiters</span>
          </div>
          <div className="text-right">
            <div className="flex flex-col items-end">
              <span className="font-medium text-gray-900">{job.recruiters_assigned_count || 0} Assigned</span>
              {job.recruiters && job.recruiters.length > 0 && (
                <span className="text-xs text-gray-500">
                  {job.recruiters.map(r => r.name).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
