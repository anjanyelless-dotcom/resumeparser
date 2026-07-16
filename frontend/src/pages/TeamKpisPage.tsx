import { useState, useEffect } from "react";
import { useTeamKPIStore } from "../store/useTeamKPIStore";
import { Calendar, Users, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

export default function TeamKpisPage() {
  const [dateRange, setLocalDateRange] = useState<string>('30');
  const [customDates, setCustomDates] = useState({ from: '', to: '' });
  const [showCustomDates, setShowCustomDates] = useState(false);
  
  const { kpis, teamTotals, isLoading, fetchTeamKPIs, setDateRange } = useTeamKPIStore();

  // Calculate date range based on selection
  const getDateRange = (range: string) => {
    const today = new Date();
    let from = '';
    let to = '';

    if (range === '1') {
      // Today
      from = to = today.toISOString().split('T')[0];
    } else if (range === '7') {
      // Last 7 days
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      from = weekAgo.toISOString().split('T')[0];
      to = today.toISOString().split('T')[0];
    } else if (range === '30') {
      // Last 30 days
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      from = monthAgo.toISOString().split('T')[0];
      to = today.toISOString().split('T')[0];
    } else if (range === '90') {
      // Last 90 days
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      from = threeMonthsAgo.toISOString().split('T')[0];
      to = today.toISOString().split('T')[0];
    } else if (range === 'custom') {
      from = customDates.from;
      to = customDates.to;
    }

    return { from, to };
  };

  // Handle date range change
  useEffect(() => {
    if (dateRange === 'custom') {
      if (customDates.from && customDates.to) {
        setDateRange({ from: customDates.from, to: customDates.to });
      }
    } else {
      const range = getDateRange(dateRange);
      setDateRange(range);
    }
  }, [dateRange, customDates]);

  // Initial load
  useEffect(() => {
    const range = getDateRange(dateRange);
    fetchTeamKPIs(range);
  }, []);

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Stat cards for team totals
  const statCards: StatCard[] = teamTotals ? [
    {
      title: "Total Submissions",
      value: teamTotals.total_submissions,
      icon: <FileText className="w-6 h-6" />,
    },
    {
      title: "Approval Rate",
      value: formatPercentage(teamTotals.approval_rate),
      icon: <CheckCircle className="w-6 h-6" />,
    },
    {
      title: "Interviews Scheduled",
      value: teamTotals.total_interviews,
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      title: "Team Members",
      value: teamTotals.recruiter_count,
      icon: <Users className="w-6 h-6" />,
    },
  ] : [];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team KPIs</h1>
            <p className="text-gray-600 mt-1">
              Performance metrics for your team
            </p>
          </div>
          
          {/* Date Range Picker */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={dateRange}
                onChange={(e) => {
                  setLocalDateRange(e.target.value);
                  setShowCustomDates(e.target.value === 'custom');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Today</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustomDates && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={customDates.from}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, from: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={customDates.to}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, to: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    const range = getDateRange('custom');
                    fetchTeamKPIs(range);
                  }}
                  disabled={!customDates.from || !customDates.to}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading KPIs...</span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && !teamTotals && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load KPIs</h3>
            <p className="text-gray-600">
              Please check your connection and try again.
            </p>
          </div>
        )}

        {/* KPI Content */}
        {!isLoading && teamTotals && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                      <div className="text-blue-600">{stat.icon}</div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </p>
                      <div className="flex items-baseline">
                        <p className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recruiter Breakdown Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recruiter Performance</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Individual recruiter metrics for the selected period
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recruiter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approval Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interviews
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Activities
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reviews
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kpis.map((recruiter) => (
                      <tr key={recruiter.recruiter_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {recruiter.recruiter_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {recruiter.recruiter_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{recruiter.submissions_count}</div>
                            <div className="text-xs text-gray-500">
                              {recruiter.active_submissions_count} active
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`text-sm font-medium ${
                              recruiter.approval_rate >= 80 ? 'text-green-600' :
                              recruiter.approval_rate >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {formatPercentage(recruiter.approval_rate)}
                            </div>
                            <div className="text-xs text-gray-500 ml-2">
                              ({recruiter.approved_reviews}/{recruiter.total_reviews})
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {recruiter.interviews_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {recruiter.total_activities}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-500">
                            <div>Created: {recruiter.activity_breakdown.submissions_created}</div>
                            <div>Reviewed: {recruiter.activity_breakdown.submissions_reviewed}</div>
                            <div>Scheduled: {recruiter.activity_breakdown.interviews_scheduled}</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {kpis.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recruiter data</h3>
                  <p className="text-gray-600">
                    No recruiter activity found for the selected period.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}