import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ClientPerformanceChartProps {
  data: Array<{
    client_name: string;
    total_placements: number;
    total_revenue: number;
    avg_revenue_per_placement: number;
    unique_jobs_filled: number;
    unique_recruiters_used: number;
  }>;
}

const ClientPerformanceChart: React.FC<ClientPerformanceChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No client performance data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Performance Overview</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="client_name" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis yAxisId="left" orientation="left" stroke="#888" />
          <YAxis yAxisId="right" orientation="right" stroke="#888" />
          <Tooltip 
            formatter={(value: any, name: any) => {
              if (name === 'total_revenue') {
                return [`$${value.toLocaleString()}`, 'Revenue'];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="total_placements" fill="#3b82f6" name="Total Placements" />
          <Bar yAxisId="right" dataKey="total_revenue" fill="#10b981" name="Total Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ClientPerformanceChart;