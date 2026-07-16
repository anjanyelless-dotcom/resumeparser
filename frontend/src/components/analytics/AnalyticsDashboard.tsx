import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, Clock, TrendingUp, CheckCircle, XCircle, Activity, Building, DollarSign } from 'lucide-react';
import MetricCard from './MetricCard';
import UploadTrendChart from './UploadTrendChart';
import ParsingStatusChart from './ParsingStatusChart';
import TopSkillsChart from './TopSkillsChart';
import AccuracyOverview from './AccuracyOverview';
import PipelineFunnel from './PipelineFunnel';
import ExportButtons from './ExportButtons';
import ClientPerformanceChart from './ClientPerformanceChart';
import PlacementsChart from './PlacementsChart';
import RevenueChart from './RevenueChart';
import PipelineAnalytics from './PipelineAnalytics';
import { analyticsService } from '../../services/analyticsService';
import { useAuthStore } from '../../store/useAuthStore';
import type { ParsingStats, SkillDistribution, AccuracyOverview as AccuracyOverviewType, Metrics, UploadTrend, RecruiterActivity } from '../../services/analyticsService';

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState<string>('30');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'placements' | 'revenue' | 'clients' | 'team' | 'pipeline'>('overview');
  
  const [parsingStats, setParsingStats] = useState<ParsingStats | null>(null);
  const [skillDistribution, setSkillDistribution] = useState<SkillDistribution[]>([]);
  const [accuracyOverview, setAccuracyOverview] = useState<AccuracyOverviewType | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [uploadTrends, setUploadTrends] = useState<UploadTrend[]>([]);
  const [recruiterActivity, setRecruiterActivity] = useState<RecruiterActivity | null>(null);
  
  // New analytics state
  const [clientPerformance, setClientPerformance] = useState<any[]>([]);
  const [placementsData, setPlacementsData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any>({ monthly_data: [], summary: {} });
  
  // Team analytics state
  const [teamClosures, setTeamClosures] = useState<any>({ daily_closures: [], summary: {} });
  const [submissionSuccessRate, setSubmissionSuccessRate] = useState<any>({ daily_success_rates: [], summary: {}, recruiter_breakdown: [] });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stats, skills, accuracy, metricsData, trends, activity] = await Promise.all([
        analyticsService.getParsingStats(),
        analyticsService.getSkillDistribution(),
        analyticsService.getAccuracyOverview(),
        analyticsService.getMetrics(),
        analyticsService.getUploadTrends(dateRange),
        analyticsService.getRecruiterActivity(),
      ]);

      setParsingStats(stats);
      setSkillDistribution(skills);
      setAccuracyOverview(accuracy);
      setMetrics(metricsData);
      setUploadTrends(trends);
      setRecruiterActivity(activity);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlacementAnalytics = async () => {
    try {
      const [clientPerf, placements, revenue] = await Promise.all([
        analyticsService.getClientPerformance(),
        analyticsService.getPlacements(),
        analyticsService.getRevenue(),
      ]);

      setClientPerformance(clientPerf);
      setPlacementsData(placements);
      setRevenueData(revenue);
    } catch (err) {
      console.error('Error fetching placement analytics:', err);
    }
  };

  const fetchTeamAnalytics = async () => {
    try {
      const [closures, successRate] = await Promise.all([
        analyticsService.getTeamClosures(),
        analyticsService.getSubmissionSuccessRate(),
      ]);

      setTeamClosures(closures);
      setSubmissionSuccessRate(successRate);
    } catch (err) {
      console.error('Error fetching team analytics:', err);
    }
  };

  useEffect(() => {
    if (activeTab !== 'overview') {
      if (activeTab === 'team') {
        fetchTeamAnalytics();
      } else {
        fetchPlacementAnalytics();
      }
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your resume parsing performance and metrics</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Today</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <ExportButtons dateRange={dateRange} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'clients'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Building className="w-4 h-4 mr-2" />
              Clients
            </button>
            <button
              onClick={() => setActiveTab('placements')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'placements'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Placements
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'revenue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Revenue
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'team'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Team Reports
            </button>
            {user?.role === 'bdm' && (
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'pipeline'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Building className="w-4 h-4 mr-2" />
                My Pipeline
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {parsingStats && (
                <>
                  <MetricCard
                    title="Total Resumes"
                    value={parsingStats.total_resumes}
                    icon={FileText}
                    color="blue"
                  />
                  <MetricCard
                    title="Successfully Parsed"
                    value={parsingStats.successfully_parsed}
                    icon={CheckCircle}
                    color="green"
                  />
                  <MetricCard
                    title="Failed Parsing"
                    value={parsingStats.failed_parsing}
                    icon={XCircle}
                    color="red"
                  />
                  <MetricCard
                    title="Success Rate"
                    value={`${Number(parsingStats.success_rate || 0).toFixed(1)}%`}
                    icon={TrendingUp}
                    color="purple"
                  />
                  <MetricCard
                    title="Avg Parsing Time"
                    value={`${Number(parsingStats.average_parsing_time || 0).toFixed(1)}s`}
                    icon={Clock}
                    color="orange"
                  />
                  <MetricCard
                    title="Avg Confidence"
                    value={`${Number(parsingStats.average_confidence_score || 0).toFixed(1)}%`}
                    icon={Activity}
                    color="yellow"
                  />
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'clients' && (
          <ClientPerformanceChart data={clientPerformance} />
        )}

        {activeTab === 'placements' && (
          <PlacementsChart data={placementsData} />
        )}

        {activeTab === 'revenue' && (
          <RevenueChart monthlyData={revenueData.monthly_data} summary={revenueData.summary} />
        )}

        {activeTab === 'team' && (
          <>
            {/* Team Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {teamClosures.summary && (
                <>
                  <MetricCard
                    title="Total Closures"
                    value={teamClosures.summary.total_closures}
                    icon={CheckCircle}
                    color="green"
                  />
                  <MetricCard
                    title="Team Recruiters"
                    value={teamClosures.summary.total_recruiters}
                    icon={Users}
                    color="blue"
                  />
                  <MetricCard
                    title="Unique Jobs"
                    value={teamClosures.summary.total_jobs}
                    icon={FileText}
                    color="purple"
                  />
                  <MetricCard
                    title="Unique Candidates"
                    value={teamClosures.summary.total_candidates}
                    icon={TrendingUp}
                    color="orange"
                  />
                </>
              )}
            </div>

            {/* Team Success Rate Summary */}
            {submissionSuccessRate.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard
                  title="Total Submissions"
                  value={submissionSuccessRate.summary.total_submissions}
                  icon={FileText}
                  color="blue"
                />
                <MetricCard
                  title="Successful"
                  value={submissionSuccessRate.summary.total_successful}
                  icon={CheckCircle}
                  color="green"
                />
                <MetricCard
                  title="Rejected"
                  value={submissionSuccessRate.summary.total_rejected}
                  icon={XCircle}
                  color="red"
                />
                <MetricCard
                  title="Success Rate"
                  value={`${Number(submissionSuccessRate.summary.overall_success_rate || 0).toFixed(1)}%`}
                  icon={TrendingUp}
                  color="purple"
                />
              </div>
            )}

            {/* Team Closures Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Team Closures Over Time
              </h3>
              {teamClosures.daily_closures && teamClosures.daily_closures.length > 0 ? (
                <div className="h-64">
                  <div className="flex items-end justify-between h-full gap-2">
                    {teamClosures.daily_closures.map((item: any, index: number) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                          style={{ height: `${(item.closures_count / Math.max(...teamClosures.daily_closures.map((d: any) => d.closures_count))) * 100}%` }}
                        />
                        <p className="text-xs text-gray-600 mt-2 text-center">{item.date}</p>
                        <p className="text-sm font-medium text-gray-900">{item.closures_count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No closures data available</p>
              )}
            </div>

            {/* Submission Success Rate Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Submission Success Rate Over Time
              </h3>
              {submissionSuccessRate.daily_success_rates && submissionSuccessRate.daily_success_rates.length > 0 ? (
                <div className="h-64">
                  <div className="flex items-end justify-between h-full gap-2">
                    {submissionSuccessRate.daily_success_rates.map((item: any, index: number) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                          style={{ height: `${(item.success_rate / 100) * 100}%` }}
                        />
                        <p className="text-xs text-gray-600 mt-2 text-center">{item.date}</p>
                        <p className="text-sm font-medium text-gray-900">{item.success_rate}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No success rate data available</p>
              )}
            </div>

            {/* Recruiter Breakdown Table */}
            {submissionSuccessRate.recruiter_breakdown && submissionSuccessRate.recruiter_breakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Recruiter Performance Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recruiter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Submissions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Successful</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {submissionSuccessRate.recruiter_breakdown.map((recruiter: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{recruiter.recruiter_name}</div>
                            <div className="text-sm text-gray-500">{recruiter.recruiter_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{recruiter.total_submissions}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{recruiter.successful_submissions}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{recruiter.rejected_submissions}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{recruiter.success_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'pipeline' && (
          <PipelineAnalytics />
        )}

        {/* Show overview content only on overview tab */}
        {activeTab === 'overview' && (
          <>
            {/* Time-Series Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <UploadTrendChart data={uploadTrends} />
              <ParsingStatusChart data={uploadTrends} />
            </div>

            {/* Top Skills and Pipeline Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TopSkillsChart data={skillDistribution} />
              {metrics && <PipelineFunnel data={metrics} />}
            </div>

            {/* Accuracy Overview */}
            {accuracyOverview && (
              <div className="mb-6">
                <AccuracyOverview data={accuracyOverview} />
              </div>
            )}

            {/* Recruiter Activity Metrics */}
            {recruiterActivity && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Recruiter Activity Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">Resumes Reviewed</p>
                    <p className="text-2xl font-bold text-blue-900">{recruiterActivity.resumes_reviewed}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-600 font-medium">Candidates Shortlisted</p>
                    <p className="text-2xl font-bold text-green-900">{recruiterActivity.candidates_shortlisted}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-600 font-medium">Candidates Rejected</p>
                    <p className="text-2xl font-bold text-red-900">{recruiterActivity.candidates_rejected}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-yellow-600 font-medium">Pending Reviews</p>
                    <p className="text-2xl font-bold text-yellow-900">{recruiterActivity.pending_reviews}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Time-Series Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <UploadTrendChart data={uploadTrends} />
          <ParsingStatusChart data={uploadTrends} />
        </div>

        {/* Top Skills and Pipeline Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TopSkillsChart data={skillDistribution} />
          {metrics && <PipelineFunnel data={metrics} />}
        </div>

        {/* Accuracy Overview */}
        {accuracyOverview && (
          <div className="mb-6">
            <AccuracyOverview data={accuracyOverview} />
          </div>
        )}

        {/* Recruiter Activity Metrics */}
        {recruiterActivity && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Recruiter Activity Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Resumes Reviewed</p>
                <p className="text-2xl font-bold text-blue-900">{recruiterActivity.resumes_reviewed}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-600 font-medium">Candidates Shortlisted</p>
                <p className="text-2xl font-bold text-green-900">{recruiterActivity.candidates_shortlisted}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm text-red-600 font-medium">Candidates Rejected</p>
                <p className="text-2xl font-bold text-red-900">{recruiterActivity.candidates_rejected}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-yellow-600 font-medium">Pending Reviews</p>
                <p className="text-2xl font-bold text-yellow-900">{recruiterActivity.pending_reviews}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
