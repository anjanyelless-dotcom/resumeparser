import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

interface AccuracyOverviewProps {
  data: {
    correction_count: number;
    field_accuracy_percentage: number;
    common_error_patterns: string[];
  };
}

const AccuracyOverview: React.FC<AccuracyOverviewProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Accuracy Overview</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Corrections Needed</p>
              <p className="text-2xl font-bold text-blue-900">{data.correction_count}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Field Accuracy</p>
              <p className="text-2xl font-bold text-green-900">{Number(data.field_accuracy_percentage || 0).toFixed(1)}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {data.common_error_patterns && data.common_error_patterns.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Common Error Patterns
          </h4>
          <div className="space-y-2">
            {data.common_error_patterns.map((pattern, index) => (
              <div
                key={index}
                className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800"
              >
                {pattern}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccuracyOverview;
