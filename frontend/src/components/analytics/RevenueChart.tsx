import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';

interface RevenueChartProps {
  monthlyData: Array<{
    month: string;
    monthly_revenue: number;
    placements_count: number;
    avg_revenue_per_placement: number;
    unique_clients: number;
    unique_recruiters: number;
  }>;
  summary: {
    total_revenue: number;
    total_placements: number;
    avg_revenue_per_placement: number;
    min_revenue: number;
    max_revenue: number;
    total_unique_clients: number;
    total_unique_recruiters: number;
  };
}

const RevenueChart: React.FC<RevenueChartProps> = ({ monthlyData, summary }) => {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No revenue data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Analytics</h3>
        <div className="text-right">
          <div className="text-sm text-gray-600">Total Revenue: <span className="font-bold text-gray-900">${summary.total_revenue.toLocaleString()}</span></div>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600 font-medium">Total Revenue</p>
          <p className="text-xl font-bold text-green-900">${summary.total_revenue.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Placements</p>
          <p className="text-xl font-bold text-blue-900">{summary.total_placements}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Avg Revenue/Placement</p>
          <p className="text-xl font-bold text-purple-900">${summary.avg_revenue_per_placement.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-sm text-orange-600 font-medium">Unique Clients</p>
          <p className="text-xl font-bold text-orange-900">{summary.total_unique_clients}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" orientation="left" stroke="#888" />
          <YAxis yAxisId="right" orientation="right" stroke="#888" />
          <Tooltip 
            formatter={(value: any, name: any) => {
              if (name === 'monthly_revenue') {
                return [`$${value.toLocaleString()}`, 'Monthly Revenue'];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="placements_count" stroke="#3b82f6" name="Placements" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="monthly_revenue" stroke="#10b981" name="Monthly Revenue" strokeWidth={3} />
          <Area yAxisId="left" type="monotone" dataKey="unique_clients" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Unique Clients" />
          <Area yAxisId="left" type="monotone" dataKey="unique_recruiters" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Unique Recruiters" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;