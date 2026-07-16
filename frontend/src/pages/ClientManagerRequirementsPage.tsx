import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useJobStore } from "../store/useJobStore";
import { useCommunicationStore } from "../store/useCommunicationStore";
import { useClientManagerSummaryStore } from "../store/useClientManagerSummaryStore";
import toast from "react-hot-toast";
import { Briefcase, Search, RefreshCw, Edit, ArrowRight, X, Phone, Calendar, Clock, Users, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface ClarifyFormData {
  description?: string;
  required_skills?: string[];
  location?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  education_level?: string;
  salary_min?: number;
  salary_max?: number;
}

export default function ClientManagerRequirementsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { jobs, isLoading, fetchJobs, clarifyJob } = useJobStore();
  const { followUps, getFollowUpsDue } = useCommunicationStore();
  const { summary, fetchSummary } = useClientManagerSummaryStore();
  const navigate = useNavigate();

  // Local input state — holds raw typed values before debounce commits them
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [inputDepartment, setInputDepartment] = useState("");
  const [inputLocation, setInputLocation] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const itemsPerPage = 20;

  // Form setup for clarify modal
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClarifyFormData>({
    defaultValues: {
      required_skills: []
    }
  });

  // Debounce: commit local inputs to filter state 400 ms after the user stops typing
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setDepartment(inputDepartment);
      setLocation(inputLocation);
      setCurrentPage(1);
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputSearchTerm, inputDepartment, inputLocation]);

  // Fetch jobs when filters or pagination change
  useEffect(() => {
    loadJobs();
  }, [currentPage, searchTerm, department, location]);

  // Fetch follow-ups due and summary on mount
  useEffect(() => {
    getFollowUpsDue();
    fetchSummary();
  }, []);

  const loadJobs = async () => {
    await fetchJobs({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      department: department || undefined,
      location: location || undefined,
      // No adminView - backend will automatically scope to client_manager's clients
    });
  };

  const handleEditDetails = (job: any) => {
    setEditingJob(job);
    setIsModalOpen(true);
    
    // Pre-fill form with current job data
    reset({
      description: job.description || '',
      required_skills: job.required_skills || [],
      location: job.location || '',
      min_experience_years: job.min_experience_years || 0,
      max_experience_years: job.max_experience_years || 0,
      salary_min: job.salary_min || undefined,
      salary_max: job.salary_max || undefined,
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingJob(null);
    reset();
  };

  const onSubmitClarify = async (data: ClarifyFormData) => {
    if (!editingJob) return;

    try {
      // Convert required_skills to array if it's a string
      let skills: string[] = [];
      const skillsValue = data.required_skills as any;
      if (skillsValue) {
        if (typeof skillsValue === 'string') {
          skills = skillsValue.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        } else if (Array.isArray(skillsValue)) {
          skills = skillsValue as string[];
        }
      }

      await clarifyJob(editingJob.id, {
        description: data.description,
        required_skills: skills,
        location: data.location,
        min_experience_years: data.min_experience_years,
        max_experience_years: data.max_experience_years,
        salary_min: data.salary_min,
        salary_max: data.salary_max,
      } as any);

      toast.success("Job requirements clarified successfully");
      handleCloseModal();
      loadJobs(); // Refresh the list
    } catch (error) {
      toast.error("Failed to clarify job requirements");
      console.error("Clarify error:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Client Requirements</h1>
            <p className="text-gray-600 mt-1">
              {jobs.length} total requirements from your clients
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.assignedClientsCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Open Requirements</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.openRequirementsCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Feedback</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.pendingFeedbackCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Follow-ups Due</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.followUpsDueCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search requirements..."
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Department..."
                value={inputDepartment}
                onChange={(e) => setInputDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Location Filter */}
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Location..."
                value={inputLocation}
                onChange={(e) => setInputLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadJobs}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Follow-ups Due Widget */}
        {followUps.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <h3 className="font-medium text-orange-900">Follow-ups Due</h3>
                <span className="bg-orange-200 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {followUps.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {followUps.slice(0, 3).map((followUp) => (
                <div key={followUp.id} className="flex items-center justify-between p-2 bg-white rounded border border-orange-100">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{followUp.subject}</p>
                    <p className="text-xs text-gray-600">{followUp.company_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {followUp.contact_phone && (
                      <a
                        href={`tel:${followUp.contact_phone}`}
                        className="p-1.5 text-orange-600 hover:bg-orange-100 rounded"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {followUp.follow_up_date ? new Date(followUp.follow_up_date).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                </div>
              ))}
              {followUps.length > 3 && (
                <p className="text-xs text-orange-600 text-center">
                  +{followUps.length - 3} more follow-ups due
                </p>
              )}
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {jobs.length} requirements
          </p>
        </div>

        {/* Loading State */}
        {isLoading && jobs.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading requirements...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && jobs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requirements found</h3>
            <p className="text-gray-600">
              {searchTerm || department || location
                ? "Try adjusting your search filters"
                : "No requirements have been created for your clients yet"}
            </p>
          </div>
        )}

        {/* Requirements Grid */}
        {!isLoading && jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        job.status === 'active' ? 'bg-green-100 text-green-700' :
                        job.status === 'open' ? 'bg-blue-100 text-blue-700' :
                        job.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {job.status || 'Unknown'}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                      {job.department && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <span>📍</span>
                          {job.location}
                        </span>
                      )}
                      {job.company_name && (
                        <span className="flex items-center gap-1">
                          <span>🏢</span>
                          {job.company_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        {job.days_open !== undefined ? `${Math.floor(job.days_open)} days open` : 'Recently created'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-2">
                      {job.description?.substring(0, 200)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditDetails(job)}
                      className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit Details
                    </button>
                    <button
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clarify Modal */}
        {isModalOpen && editingJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Edit Requirement Details</h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmitClarify)} className="space-y-4">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      {...register('description', { 
                        required: 'Description is required',
                        minLength: { value: 50, message: 'Description must be at least 50 characters' }
                      })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter job description..."
                    />
                    {errors.description && (
                      <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  {/* Required Skills */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Skills (comma-separated)
                    </label>
                    <input
                      {...register('required_skills')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., JavaScript, React, Node.js"
                    />
                    {errors.required_skills && (
                      <p className="text-red-600 text-sm mt-1">{errors.required_skills.message}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      {...register('location', { maxLength: { value: 100, message: 'Location must be less than 100 characters' } })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., San Francisco, CA"
                    />
                    {errors.location && (
                      <p className="text-red-600 text-sm mt-1">{errors.location.message}</p>
                    )}
                  </div>

                  {/* Experience Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Experience (years)
                      </label>
                      <input
                        {...register('min_experience_years', { 
                          min: { value: 0, message: 'Must be at least 0' },
                          max: { value: 50, message: 'Must be at most 50' }
                        })}
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="0"
                      />
                      {errors.min_experience_years && (
                        <p className="text-red-600 text-sm mt-1">{errors.min_experience_years.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Experience (years)
                      </label>
                      <input
                        {...register('max_experience_years', { 
                          min: { value: 0, message: 'Must be at least 0' },
                          max: { value: 50, message: 'Must be at most 50' }
                        })}
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="10"
                      />
                      {errors.max_experience_years && (
                        <p className="text-red-600 text-sm mt-1">{errors.max_experience_years.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Salary
                      </label>
                      <input
                        {...register('salary_min', { 
                          min: { value: 0, message: 'Must be positive' }
                        })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="50000"
                      />
                      {errors.salary_min && (
                        <p className="text-red-600 text-sm mt-1">{errors.salary_min.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Salary
                      </label>
                      <input
                        {...register('salary_max', { 
                          min: { value: 0, message: 'Must be positive' }
                        })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="100000"
                      />
                      {errors.salary_max && (
                        <p className="text-red-600 text-sm mt-1">{errors.salary_max.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}