import { X } from "lucide-react";

interface JobDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function JobDetailsDrawer({
  isOpen,
  onClose,
  job,
}: JobDetailsDrawerProps) {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <section className="absolute inset-y-0 right-0 flex max-w-full pl-10">
          <div className="w-screen max-w-2xl transform transition-all">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
              <div className="bg-indigo-700 px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold leading-6 text-white">
                    Job Details
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-md text-indigo-200 hover:text-white focus:outline-none"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-indigo-200">
                    {job.title}
                  </p>
                </div>
              </div>
              
              <div className="relative flex-1 px-4 py-6 sm:px-6 space-y-8">
                
                {/* General Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                    General Information
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Title</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.title}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Department</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.department || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Client</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.manual_client_name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Priority</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.priority || 'Normal'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">{job.status || 'Active'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Job Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                    Job Details
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.location || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Employment Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.employment_type || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Experience</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {job.min_experience_years || 0} - {job.max_experience_years || 0} Years
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Education</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.education_requirement || job.education_level || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Salary Range</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {job.salary_min && job.salary_max 
                          ? `${job.salary_min} - ${job.salary_max} ${job.currency || ''}` 
                          : job.salary_range || 'Not specified'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Required Skills</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {Array.isArray(job.required_skills) && job.required_skills.length > 0 
                          ? job.required_skills.map((s: any) => typeof s === 'string' ? s : s.skill_name).join(', ')
                          : 'None specified'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                        {job.description || 'No description provided.'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Assignment */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                    Assignment
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Team Lead</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.team_lead_name || "Unassigned"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Recruiters</dt>
                      <dd className="mt-1 text-sm text-gray-900">{job.recruiters_assigned_count || 0} Assigned</dd>
                    </div>
                  </dl>
                </div>

                {/* Workflow */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                    Workflow
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-semibold">{job.current_recruitment_stage || "N/A"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Progress</dt>
                      <dd className="mt-2 text-sm text-gray-900">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-indigo-600 h-2.5 rounded-full" 
                            style={{ width: `${job.recruitment_progress_percentage || 0}%` }}
                          ></div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 text-right">{job.recruitment_progress_percentage || 0}% Complete</p>
                      </dd>
                    </div>
                  </dl>
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
