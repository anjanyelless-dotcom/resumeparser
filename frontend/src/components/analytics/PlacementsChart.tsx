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

interface PlacementsChartProps {
  data: Array<{
    date: string;
    placements_count: number;
    daily_revenue: number;
    unique_clients: number;
    unique_recruiters: number;
    unique_jobs: number;
  }>;
}

const PlacementsChart: React.FC<PlacementsChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No placement data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Placement Trends</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" orientation="left" stroke="#888" />
          <YAxis yAxisId="right" orientation="right" stroke="#888" />
          <Tooltip 
            formatter={(value: any, name: any) => {
              if (name === 'daily_revenue') {
                return [`$${value.toLocaleString()}`, 'Daily Revenue'];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="placements_count" stroke="#3b82f6" name="Placements" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="daily_revenue" stroke="#10b981" name="Daily Revenue" strokeWidth={2} />
          <Area yAxisId="left" type="monotone" dataKey="unique_clients" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Unique Clients" />
          <Area yAxisId="left" type="monotone" dataKey="unique_recruiters" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Unique Recruiters" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PlacementsChart;