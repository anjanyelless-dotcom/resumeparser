import React, { useState, useEffect } from 'react';
import { Calendar, Building2, DollarSign, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';

interface PipelineAnalyticsProps {
  userRole?: string;
}

const PipelineAnalytics: React.FC<PipelineAnalyticsProps> = () => {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  
  const [newClientsData, setNewClientsData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);

  useEffect(() => {
    fetchPipelineAnalytics();
  }, [dateRange]);

  const fetchPipelineAnalytics = async () => {
    setLoading(true);
    try {
      const [clients, revenue, pipeline] = await Promise.all([
        analyticsService.getNewClientsAcquired(dateRange.from, dateRange.to),
        analyticsService.getRevenueGenerated(dateRange.from, dateRange.to),
        analyticsService.getOpenOpportunities(dateRange.from, dateRange.to),
      ]);

      setNewClientsData(clients || []);
      setRevenueData(revenue || []);
      setPipelineData(pipeline || []);
    } catch (error) {
      console.error('Error fetching pipeline analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* New Clients Acquired Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">New Clients Acquired</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={newClientsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" name="Clients Won" />
          </BarChart>
        </ResponsiveContainer>
        {newClientsData.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No data available for selected period</p>
        )}
      </div>

      {/* Revenue Generated Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Revenue Generated</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
            <Legend />
            <Area type="monotone" dataKey="total_revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
        {revenueData.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No data available for selected period</p>
        )}
      </div>

      {/* Pipeline Funnel Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pipeline Funnel</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pipelineData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="pipeline_stage" type="category" width={100} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8b5cf6" name="Clients" />
          </BarChart>
        </ResponsiveContainer>
        {pipelineData.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No data available for selected period</p>
        )}
      </div>
    </div>
  );
};

export default PipelineAnalytics;
