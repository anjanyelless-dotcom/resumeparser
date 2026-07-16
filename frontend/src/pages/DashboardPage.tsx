import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCandidateStore } from "../store/useCandidateStore";
import { useJobStore } from "../store/useJobStore";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../services/api";
import { DashboardCard } from "../components/dashboard/DashboardCard";
import {
  keyMetrics,
  recruitmentOperations,
  resumeIntelligence,
  teamManagement,
  clientBdmOperations,
  systemAdministration,
  quickActions
} from "../config/dashboardConfig";
import {
  Users,
  Briefcase,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Settings
} from "lucide-react";

interface RecentActivity {
  id: string;
  type: 'candidate' | 'job' | 'submission' | 'interview';
  description: string;
  timestamp: string;
  user?: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { candidates, fetchCandidates, pagination } = useCandidateStore();
  const { jobs, fetchJobs, matchResults, fetchMatchResults } = useJobStore();
  const { isAuthenticated, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [dynamicMetrics, setDynamicMetrics] = useState(keyMetrics);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Load initial data with proper pagination
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const limit = 100;
        
        await Promise.all([
          fetchCandidates(1, limit),
          fetchJobs(),
          fetchMatchResults("all"),
        ]);
        
        // Fetch dynamic admin summary
        if (user?.role === 'admin') {
          try {
            const res = await api.get('/dashboard/admin-summary');
            const data = res.data;
            
            // Map the static keyMetrics to the dynamic data
            setDynamicMetrics(prev => prev.map(metric => {
              switch (metric.id) {
                case 'total-candidates': return { ...metric, count: data.totalCandidates ?? 0 };
                case 'active-jobs': return { ...metric, count: data.activeJobs ?? 0 };
                case 'total-recruiters': return { ...metric, count: data.totalRecruiters ?? 0 };
                case 'total-clients': return { ...metric, count: data.totalClients ?? 0 };
                case 'today-submissions': return { ...metric, count: data.todaysSubmissions ?? 0 };
                case 'interviews-scheduled': return { ...metric, count: data.interviewsScheduled ?? 0 };
                case 'parsed-resumes': return { ...metric, count: data.parsedResumes ?? 0 };
                case 'ai-match-success': return { ...metric, count: data.aiMatchSuccessRate ? `${data.aiMatchSuccessRate}%` : '0%' };
                default: return metric;
              }
            }));

            if (data.recentActivities && Array.isArray(data.recentActivities)) {
              setRecentActivities(data.recentActivities);
            } else {
              generateRecentActivities();
            }
          } catch (e) {
            console.error('Failed to fetch dynamic admin dashboard metrics', e);
            generateRecentActivities();
          }
        } else {
          // Keep mock for non-admins for now if not implemented
          generateRecentActivities();
        }
        
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          if (axiosError.response?.status === 401 || axiosError.response?.status === 400) {
            navigate("/login");
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchCandidates, fetchJobs, fetchMatchResults, isAuthenticated, navigate]);

  useEffect(() => {
    // Data is loaded, calculations can be added if needed
  }, [pagination, jobs, matchResults]);

  const generateRecentActivities = () => {
    const activities: RecentActivity[] = [
      {
        id: '1',
        type: 'candidate',
        description: 'New candidate registered: John Smith',
        timestamp: '2 minutes ago',
        user: 'System'
      },
      {
        id: '2',
        type: 'job',
        description: 'New job created: Senior Full Stack Developer',
        timestamp: '15 minutes ago',
        user: 'Admin'
      },
      {
        id: '3',
        type: 'submission',
        description: 'Resume submitted for Java Developer position',
        timestamp: '1 hour ago',
        user: 'Recruiter'
      },
      {
        id: '4',
        type: 'interview',
        description: 'Interview scheduled with candidate #1234',
        timestamp: '2 hours ago',
        user: 'Team Lead'
      },
      {
        id: '5',
        type: 'candidate',
        description: 'Resume parsing completed for candidate #5678',
        timestamp: '3 hours ago',
        user: 'System'
      }
    ];
    setRecentActivities(activities);
  };

  const handleCardClick = (module: any) => {
    navigate(module.path);
  };

  const handleQuickAction = (action: any) => {
    navigate(action.path);
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'candidate':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'job':
        return <Briefcase className="h-4 w-4 text-green-600" />;
      case 'submission':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'interview':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const recentJobs = (jobs || []).slice(0, 5);
  const recentCandidates = (candidates || []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.email || 'Admin'}! Here's your comprehensive overview.
        </p>
      </div>

      {/* Section 1: Key Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
          Key Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
          {dynamicMetrics.map((metric) => (
            <DashboardCard
              key={metric.id}
              {...metric}
              onClick={() => handleCardClick(metric)}
            />
          ))}
        </div>
      </div>

      {/* Section 2: Recruitment Operations */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Briefcase className="h-5 w-5 mr-2 text-green-600" />
          Recruitment Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recruitmentOperations.map((module) => (
            <DashboardCard
              key={module.id}
              {...module}
              onClick={() => handleCardClick(module)}
            />
          ))}
        </div>
      </div>

      {/* Section 3: Resume Intelligence */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          Resume Intelligence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {resumeIntelligence.map((module) => (
            <DashboardCard
              key={module.id}
              {...module}
              onClick={() => handleCardClick(module)}
            />
          ))}
        </div>
      </div>

      {/* Section 4: Team Management */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          Team Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teamManagement.map((module) => (
            <DashboardCard
              key={module.id}
              {...module}
              onClick={() => handleCardClick(module)}
            />
          ))}
        </div>
      </div>

      {/* Section 5: Client & BDM Operations */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-orange-600" />
          Client & BDM Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clientBdmOperations.map((module) => (
            <DashboardCard
              key={module.id}
              {...module}
              onClick={() => handleCardClick(module)}
            />
          ))}
        </div>
      </div>

      {/* Section 6: System Administration */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-gray-600" />
          System Administration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {systemAdministration.map((module) => (
            <DashboardCard
              key={module.id}
              {...module}
              onClick={() => handleCardClick(module)}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-indigo-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <DashboardCard
              key={action.id}
              {...action}
              onClick={() => handleQuickAction(action)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Section: Recent Activity, Jobs, Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-4">
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                      {activity.user && (
                        <p className="text-xs text-gray-400 mt-1">by {activity.user}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Jobs</h3>
          </div>
          <div className="p-4">
            {recentJobs.length > 0 ? (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <p className="text-sm font-medium text-gray-900">{job.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{job.department}</p>
                    <p className="text-xs text-gray-400 mt-1">{job.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No recent jobs</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Candidates</h3>
          </div>
          <div className="p-4">
            {recentCandidates.length > 0 ? (
              <div className="space-y-3">
                {recentCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          {candidate.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{candidate.full_name}</p>
                        <p className="text-xs text-gray-500">{candidate.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No recent candidates</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
