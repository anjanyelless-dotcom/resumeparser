import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { ArrowLeft, Building2, MapPin, DollarSign, Calendar, Briefcase, Users } from "lucide-react";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      try {
        const response = await api.get(`/jobs/${id}`);
        setJob(response.data.job);
      } catch (err: any) {
        console.error("Failed to fetch job:", err);
        setError(err.response?.data?.message || "Failed to fetch job");
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Job not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/admin/jobs")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
          <p className="mt-2 text-gray-600">
            {job.client_id ? `Client ID: ${job.client_id}` : "No client assigned"}
          </p>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Job Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            {job.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-gray-900">{job.location}</p>
                </div>
              </div>
            )}

            {/* Department */}
            {job.department && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="text-gray-900">{job.department}</p>
                </div>
              </div>
            )}

            {/* Employment Type */}
            {job.employment_type && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Employment Type</p>
                  <p className="text-gray-900 capitalize">{job.employment_type}</p>
                </div>
              </div>
            )}

            {/* Work Mode */}
            {job.work_mode && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Work Mode</p>
                  <p className="text-gray-900 capitalize">{job.work_mode}</p>
                </div>
              </div>
            )}

            {/* Salary */}
            {(job.salary_min || job.salary_max) && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Salary</p>
                  <p className="text-gray-900">
                    {job.salary_min && job.salary_max 
                      ? `₹${Number(job.salary_min).toLocaleString()} - ₹${Number(job.salary_max).toLocaleString()}`
                      : job.salary_min 
                        ? `₹${Number(job.salary_min).toLocaleString()}+`
                        : job.salary_max
                        ? `Up to ₹${Number(job.salary_max).toLocaleString()}`
                        : 'Not specified'}
                  </p>
                </div>
              </div>
            )}

            {/* Experience */}
            {(job.min_experience_years || job.max_experience_years) && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Experience</p>
                  <p className="text-gray-900">
                    {job.min_experience_years && job.max_experience_years
                      ? `${job.min_experience_years} - ${job.max_experience_years} years`
                      : job.min_experience_years 
                        ? `${job.min_experience_years}+ years`
                        : job.max_experience_years
                        ? `Up to ${job.max_experience_years} years`
                        : 'Not specified'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          {job.required_skills && job.required_skills.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              job.status === 'active' ? 'bg-green-100 text-green-800' :
              job.status === 'closed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {job.status || 'Unknown'}
            </span>
          </div>

          {/* Created At */}
          <div className="text-sm text-gray-500">
            Created: {new Date(job.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
