import React, { useEffect } from 'react';
import { useParams, Outlet, Link, useLocation } from 'react-router-dom';
import { useJobStore } from '../store/useJobStore';

export default function RequirementWorkspacePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const { 
    currentJob, 
    pipelineSummary, 
    isLoading,
    setActiveJobId 
  } = useJobStore();

  useEffect(() => {
    if (jobId) {
      setActiveJobId(jobId);
    }
    return () => {
      setActiveJobId(null);
    };
  }, [jobId, setActiveJobId]);

  if (isLoading && !currentJob) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Requirement Not Found</h2>
        <p className="mt-2 text-gray-500">The requested requirement does not exist or you don't have access to it.</p>
        <Link to="/dashboard" className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-500">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const tabs = [
    { name: 'Overview', href: `/recruiter/workspace/${jobId}` },
    { name: 'Candidates', href: `/recruiter/workspace/${jobId}/candidates` },
    { name: 'AI Matching', href: `/recruiter/workspace/${jobId}/matching` },
    { name: 'Hiring Process', href: `/recruiter/workspace/${jobId}/submissions` },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              {currentJob.title}
            </h2>
            <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="font-medium mr-1">Client:</span> 
                {currentJob.manual_client_name || currentJob.client_id || 'Internal'}
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="font-medium mr-1">Location:</span> 
                {currentJob.location || 'Not specified'}
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="font-medium mr-1">Status:</span> 
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  currentJob.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                  currentJob.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentJob.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Summary Pipeline view */}
        {pipelineSummary && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Pipeline Status</h3>
            <div className="relative">
              <div className="overflow-hidden rounded-full bg-gray-200" style={{ height: '8px' }}>
                <div 
                  className="bg-indigo-600" 
                  style={{ 
                    height: '100%', 
                    width: `${Math.min(100, (pipelineSummary.placed / (currentJob.number_of_openings || 1)) * 100)}%` 
                  }} 
                />
              </div>
              
              <div className="mt-4 grid grid-cols-5 gap-4 text-center">
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-gray-900">{pipelineSummary.candidate_sourcing}</span>
                  <span className="text-xs font-medium text-gray-500 uppercase">Sourced</span>
                </div>
                <div className="flex flex-col border-l border-gray-200">
                  <span className="text-2xl font-semibold text-indigo-600">{pipelineSummary.ai_matching}</span>
                  <span className="text-xs font-medium text-gray-500 uppercase">Matched</span>
                </div>
                <div className="flex flex-col border-l border-gray-200">
                  <span className="text-2xl font-semibold text-purple-600">{pipelineSummary.shortlisted}</span>
                  <span className="text-xs font-medium text-gray-500 uppercase">Shortlisted</span>
                </div>
                <div className="flex flex-col border-l border-gray-200">
                  <span className="text-2xl font-semibold text-blue-600">{pipelineSummary.interviews}</span>
                  <span className="text-xs font-medium text-gray-500 uppercase">Interviews</span>
                </div>
                <div className="flex flex-col border-l border-gray-200">
                  <span className="text-2xl font-semibold text-green-600">
                    {pipelineSummary.placed} / {currentJob.number_of_openings || '-'}
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase">Placed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intelligent Workflow Resume */}
      {pipelineSummary && (
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-indigo-900">Recommended Next Action</h4>
            <p className="text-sm text-indigo-700 mt-1">
              {pipelineSummary.candidate_sourcing === 0 
                ? "No candidates yet. Start by sourcing and uploading resumes for this requirement."
                : pipelineSummary.ai_matching === 0 
                ? "Candidates have been sourced. Proceed to AI Matching to evaluate them."
                : pipelineSummary.shortlisted === 0 
                ? "AI Matching completed. Review the match results and shortlist top candidates."
                : "Shortlisted candidates available. Proceed with the Hiring Process."}
            </p>
          </div>
          <Link
            to={
              pipelineSummary.candidate_sourcing === 0 
                ? `/recruiter/workspace/${jobId}/candidates`
                : pipelineSummary.ai_matching === 0 
                ? `/recruiter/workspace/${jobId}/matching`
                : pipelineSummary.shortlisted === 0 
                ? `/recruiter/workspace/${jobId}/matching`
                : `/recruiter/workspace/${jobId}/submissions`
            }
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {pipelineSummary.candidate_sourcing === 0 
              ? "Source Candidates"
              : pipelineSummary.ai_matching === 0 
              ? "Run AI Match"
              : pipelineSummary.shortlisted === 0 
              ? "Review Matches"
              : "Manage Hiring"}
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isExact = tab.href === `/recruiter/workspace/${jobId}`;
            const isActive = isExact 
              ? location.pathname === tab.href 
              : location.pathname.startsWith(tab.href);
              
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`
                  whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                  ${isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {location.pathname === `/recruiter/workspace/${jobId}` ? (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Job Description
              </h3>
              <div className="mt-4 max-w-3xl text-sm text-gray-500 whitespace-pre-wrap">
                {currentJob.description || 'No description provided.'}
              </div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
