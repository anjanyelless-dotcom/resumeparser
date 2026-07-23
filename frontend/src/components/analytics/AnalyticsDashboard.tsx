import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, Clock, TrendingUp, CheckCircle, XCircle, Activity } from 'lucide-react';
import MetricCard from './MetricCard';
import UploadTrendChart from './UploadTrendChart';
import ParsingStatusChart from './ParsingStatusChart';
import TopSkillsChart from './TopSkillsChart';
import AccuracyOverview from './AccuracyOverview';
import PipelineFunnel from './PipelineFunnel';
import ExportButtons from './ExportButtons';
import { analyticsService } from '../../services/analyticsService';
import type { ParsingStats, SkillDistribution, AccuracyOverview as AccuracyOverviewType, Metrics, UploadTrend, RecruiterActivity } from '../../services/analyticsService';

const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('30');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [parsingStats, setParsingStats] = useState<ParsingStats | null>(null);
  const [skillDistribution, setSkillDistribution] = useState<SkillDistribution[]>([]);
  const [accuracyOverview, setAccuracyOverview] = useState<AccuracyOverviewType | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [uploadTrends, setUploadTrends] = useState<UploadTrend[]>([]);
  const [recruiterActivity, setRecruiterActivity] = useState<RecruiterActivity | null>(null);

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
