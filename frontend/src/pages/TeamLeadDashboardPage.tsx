import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamLeadSummaryStore } from "../store/useTeamLeadSummaryStore";
import { useSubmissionReviewStore } from "../store/useSubmissionReviewStore";
import { useTeamRequirementStore } from "../store/useTeamRequirementStore";
import { Users, FileText, CheckCircle, Clock, Briefcase, TrendingUp, Eye, ArrowRight } from "lucide-react";

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function TeamLeadDashboardPage() {
  const navigate = useNavigate();
  const { summary, isLoading: summaryLoading, fetchSummary } = useTeamLeadSummaryStore();
  const { submissions, fetchPendingSubmissions } = useSubmissionReviewStore();
  const { requirements, fetchTeamRequirements } = useTeamRequirementStore();
  const [isLoading, setIsLoading] = useState(summaryLoading);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchSummary(),
          fetchPendingSubmissions({ limit: 5 }),
          fetchTeamRequirements({ limit: 5 })
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysOpen = (createdDate: string) => {
    const created = new Date(createdDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const statCards: StatCard[] = summary ? [
    {
      title: "Team Members",
      value: summary.teamSize,
      icon: <Users className="w-6 h-6" />,
    },
    {
      title: "Open Requirements",
      value: summary.openRequirementsCount,
      icon: <FileText className="w-6 h-6" />,
    },
    {
      title: "Pending Reviews",
      value: summary.pendingReviewsCount,
      icon: <Eye className="w-6 h-6" />,
    },
    {
      title: "Monthly Closures",
      value: summary.monthlyClosuresCount,
      icon: <CheckCircle className="w-6 h-6" />,
    },
  ] : [];

  const topPendingReviews = submissions.slice(0, 5);

  const topAgingRequirements = requirements
    .filter(req => req.status === 'open' || req.assigned_recruiter_count === 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Team Lead Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Overview of your team's performance and pending tasks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                  <div className="text-blue-600">{stat.icon}</div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Pending Reviews</h2>
                  <p className="text-sm text-gray-600 mt-1">Submissions awaiting your review</p>
                </div>
                <button
                  onClick={() => navigate('/team-lead/review-queue')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View All
                </button>
              </div>
              
              <div className="divide-y divide-gray-200">
                {topPendingReviews.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-sm text-gray-500">No pending reviews at the moment.</p>
                  </div>
                ) : (
                  topPendingReviews.map((submission) => (
                    <div key={submission.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate('/team-lead/review-queue')}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-2 h-2 bg-orange-400 rounded-full"></div>
                            <div>
                              <p className="font-medium text-gray-900">{submission.candidate_name}</p>
                              <p className="text-sm text-gray-500">{submission.job_title}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{submission.submitted_by}</p>
                            <p className="text-xs text-gray-400">{formatDate(submission.created_at)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Aging Requirements</h2>
                    <p className="text-sm text-gray-600 mt-1">Oldest open positions needing attention</p>
                  </div>
                  <button
                    onClick={() => navigate('/team-lead/requirements')}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View All
                  </button>
                </div>
              
                <div className="divide-y divide-gray-200">
                  {topAgingRequirements.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-2">All requirements covered</h3>
                      <p className="text-sm text-gray-500">No aging requirements at the moment.</p>
                    </div>
                  ) : (
                    topAgingRequirements.map((requirement) => {
                      const daysOpen = getDaysOpen(requirement.created_at);
                      return (
                        <div key={requirement.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate('/team-lead/requirements')}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${daysOpen > 30 ? 'bg-red-400' : daysOpen > 14 ? 'bg-orange-400' : 'bg-yellow-400'}`}></div>
                                <div>
                                  <p className="font-medium text-gray-900">{requirement.title}</p>
                                  <p className="text-sm text-gray-500">{requirement.department}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{daysOpen} days</p>
                                </div>
                                <p className="text-xs text-gray-400">{formatDate(requirement.created_at)}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Team Performance</h2>
              <p className="text-sm text-gray-600 mt-1">Quick overview of your team's key metrics</p>
            </div>
            
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{summary?.monthlyClosuresCount || 0}</p>
                  <p className="text-sm text-gray-600">Monthly Closures</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{summary?.openRequirementsCount || 0}</p>
                  <p className="text-sm text-gray-600">Open Requirements</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{summary?.pendingReviewsCount || 0}</p>
                  <p className="text-sm text-gray-600">Pending Reviews</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => navigate('/team-lead/review-queue')}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Review Queue
            </button>
            <button
              onClick={() => navigate('/team-lead/requirements')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              Requirements
            </button>
            <button
              onClick={() => navigate('/team-lead/team-kpis')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Team KPIs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}