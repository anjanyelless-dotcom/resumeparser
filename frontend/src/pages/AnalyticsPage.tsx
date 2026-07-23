import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart3, Brain, Sparkles, TrendingUp, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import { api } from '../services/api';

// ─── Parser Analytics Tab ────────────────────────────────────
export const ParserAnalyticsTab: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics/parsing-stats');
        setData(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load parser metrics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-gray-500">Loading parser analytics…</span>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <XCircle className="w-6 h-6 text-red-400 mr-2" />
        <span className="text-gray-500">{error || 'No data available'}</span>
      </div>
    );
  }

  const stats = [
    { label: 'Total Parsed', value: data.total_parsed ?? data.total ?? 0, icon: Brain, color: 'indigo' },
    { label: 'Successful', value: data.successful ?? data.success_count ?? 0, icon: CheckCircle, color: 'green' },
    { label: 'Failed', value: data.failed ?? data.fail_count ?? 0, icon: XCircle, color: 'red' },
    { label: 'Pending', value: data.pending ?? data.in_progress ?? 0, icon: RefreshCw, color: 'yellow' },
    { label: 'Success Rate', value: `${data.success_rate ?? ((data.successful / (data.total_parsed || 1)) * 100).toFixed(1)}%`, icon: TrendingUp, color: 'blue' },
    { label: 'Avg Parse Time', value: data.avg_parse_time ? `${data.avg_parse_time}s` : 'N/A', icon: BarChart3, color: 'purple' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-500" />
          Parser Analytics
        </h2>
        <p className="text-gray-500 text-sm mt-1">Resume parsing performance and error analysis</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <Icon className="w-5 h-5 mb-2 opacity-70" />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-1 opacity-80">{label}</div>
          </div>
        ))}
      </div>

      {/* Skill Distribution if available */}
      {data.skill_distribution?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Top Skills Parsed</h3>
          <div className="space-y-3">
            {data.skill_distribution.slice(0, 10).map((item: any, i: number) => {
              const total = data.skill_distribution[0].count || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 truncate">{item.skill || item.skill_name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw data fallback */}
      {!data.skill_distribution && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Raw Metrics</h3>
          <pre className="text-xs text-gray-600 overflow-auto max-h-64">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// ─── AI Analytics Tab ─────────────────────────────────────────
export const AIAnalyticsTab: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Try dedicated ai-analytics endpoint first, fall back to recruiter-activity
        let res;
        try {
          res = await api.get('/analytics/ai-analytics');
        } catch {
          res = await api.get('/analytics/recruiter-activity');
        }
        setData(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load AI analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-500 mr-2" />
        <span className="text-gray-500">Loading AI analytics…</span>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <XCircle className="w-6 h-6 text-red-400 mr-2" />
        <span className="text-gray-500">{error || 'No data available'}</span>
      </div>
    );
  }

  // Map summary fields
  const summary = data.summary || data;
  const summaryCards = [
    { label: 'Total Matched', value: summary.total_matched ?? summary.total_submissions ?? 'N/A' },
    { label: 'Avg Match Score', value: summary.avg_match_score ? `${Number(summary.avg_match_score).toFixed(1)}%` : 'N/A' },
    { label: 'High Accuracy', value: summary.high_accuracy ?? summary.submissions_placed ?? 'N/A' },
    { label: 'Submissions', value: summary.total_submissions ?? summary.total ?? 'N/A' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Analytics
        </h2>
        <p className="text-gray-500 text-sm mt-1">AI matching performance, model accuracy, and recruiter activity</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recruiter Breakdown if available */}
      {(data.recruiter_breakdown || data.recruiters)?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Recruiter Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-500">Recruiter</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Submissions</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Placed</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {(data.recruiter_breakdown || data.recruiters).slice(0, 10).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 text-gray-800">{r.recruiter_name || r.email || 'Unknown'}</td>
                    <td className="py-2 text-right text-gray-600">{r.total_submissions ?? '-'}</td>
                    <td className="py-2 text-right text-gray-600">{r.placements ?? r.placed ?? '-'}</td>
                    <td className="py-2 text-right text-gray-600">{r.avg_match_score ? `${Number(r.avg_match_score).toFixed(0)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw fallback */}
      {!((data.recruiter_breakdown || data.recruiters)?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Raw AI Data</h3>
          <pre className="text-xs text-gray-600 overflow-auto max-h-64">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// ─── Main AnalyticsPage ───────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content rendered by parent navigation */}
      <AnalyticsDashboard />
    </div>
  );
};

export default AnalyticsPage;
