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
} from 'recharts';

interface UploadTrendChartProps {
  data: Array<{
    date: string;
    count: number;
    success_count: number;
    failure_count: number;
  }>;
}

const UploadTrendChart: React.FC<UploadTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume Upload Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Total Uploads" />
          <Line type="monotone" dataKey="success_count" stroke="#10b981" name="Successful" />
          <Line type="monotone" dataKey="failure_count" stroke="#ef4444" name="Failed" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UploadTrendChart;
