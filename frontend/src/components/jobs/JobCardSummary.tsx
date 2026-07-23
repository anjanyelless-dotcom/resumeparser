import React, { useState } from 'react';
import type { Job } from '../../types/job';

interface JobCardSummaryProps {
  job: Job;
  variant: "JOB" | "TEAM_LEAD" | "RECRUITER";
}

export const JobCardSummary: React.FC<JobCardSummaryProps> = ({ job, variant }) => {
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [expandedSkills, setExpandedSkills] = useState(false);

  const isFullView = variant === "JOB";

  return (
    <>
      {/* Description Preview */}
      {job.description && (
        <div 
          className="mb-4 cursor-pointer group"
          onClick={() => isFullView && setExpandedDesc(!expandedDesc)}
        >
          <p className={`text-sm text-gray-600 ${isFullView && expandedDesc ? '' : 'line-clamp-2'}`}>
            {job.description?.trim() || "No description provided"}
          </p>
          {isFullView && job.description.length > 100 && (
            <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-block font-medium">
              {expandedDesc ? "Show less" : "Show more"}
            </span>
          )}
        </div>
      )}

      {/* Location (always visible) */}
      <div className={`grid gap-y-2 gap-x-4 mb-4 ${isFullView ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="flex items-center text-xs text-gray-600">
          <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="truncate">{job.location?.trim() || "Location not set"}</span>
        </div>

        {/* Full View Details */}
        {isFullView && (
          <>
            <div className="flex items-center text-xs text-gray-600">
              <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span className="truncate">{job.employment_type || "Type not set"}</span>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span className="truncate">{job.min_experience_years}-{job.max_experience_years} years</span>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              <span className="truncate">{job.education_requirement || "Education not set"}</span>
            </div>
            {job.work_mode && (
              <div className="flex items-center text-xs text-gray-600">
                <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <span className="truncate">{job.work_mode}</span>
              </div>
            )}
            {(job.salary_min || job.salary_max) && (
              <div className="flex items-center text-xs text-gray-600 col-span-2">
                <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span className="truncate">
                  {job.salary_min || '0'} - {job.salary_max || '0'} {job.currency || 'USD'} {job.salary_period ? `/${job.salary_period}` : ''}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Skills (Only Full View) */}
      {isFullView && (
        <div className="mb-4 space-y-3 flex-1">
          {job.required_skills && job.required_skills.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Must Have</p>
              <div className="flex flex-wrap gap-1">
                {(expandedSkills ? job.required_skills : job.required_skills.slice(0, 3)).map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {typeof skill === 'string' ? skill : skill.skill_name}
                  </span>
                ))}
                {!expandedSkills && job.required_skills.length > 3 && (
                  <span 
                    onClick={() => setExpandedSkills(true)}
                    className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                  >
                    +{job.required_skills.length - 3} more
                  </span>
                )}
                {expandedSkills && job.required_skills.length > 3 && (
                  <span 
                    onClick={() => setExpandedSkills(false)}
                    className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                  >
                    Show less
                  </span>
                )}
              </div>
            </div>
          )}
          {job.preferred_skills && job.preferred_skills.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Good to Have</p>
              <div className="flex flex-wrap gap-1">
                {(expandedSkills ? job.preferred_skills : job.preferred_skills.slice(0, 3)).map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                    {typeof skill === 'string' ? skill : skill.skill_name}
                  </span>
                ))}
                {!expandedSkills && job.preferred_skills.length > 3 && (
                  <span 
                    onClick={() => setExpandedSkills(true)}
                    className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                  >
                    +{job.preferred_skills.length - 3} more
                  </span>
                )}
                {expandedSkills && job.preferred_skills.length > 3 && (
                  <span 
                    onClick={() => setExpandedSkills(false)}
                    className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded cursor-pointer transition-colors"
                  >
                    Show less
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
