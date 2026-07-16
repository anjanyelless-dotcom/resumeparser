import React from 'react';
import { Filter } from 'lucide-react';

interface PipelineFunnelProps {
  data: {
    total_candidates: number;
    parsed_candidates: number;
    validated_candidates: number;
    reviewed_candidates: number;
    matched_candidates: number;
    shortlisted_candidates: number;
  };
}

const PipelineFunnel: React.FC<PipelineFunnelProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  const stages = [
    { name: 'Uploaded', count: data.total_candidates, color: 'bg-blue-500' },
    { name: 'Parsed', count: data.parsed_candidates, color: 'bg-indigo-500' },
    { name: 'Validated', count: data.validated_candidates, color: 'bg-purple-500' },
    { name: 'Reviewed', count: data.reviewed_candidates, color: 'bg-pink-500' },
    { name: 'Matched', count: data.matched_candidates, color: 'bg-orange-500' },
    { name: 'Shortlisted', count: data.shortlisted_candidates, color: 'bg-green-500' },
  ];

  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Filter className="w-5 h-5 mr-2" />
        Candidate Pipeline Funnel
      </h3>
      
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          return (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                <span className="text-sm font-bold text-gray-900">{stage.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div
                  className={`${stage.color} h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all duration-300`}
                  style={{ width: `${widthPercentage}%` }}
                >
                  {widthPercentage > 10 ? `${Math.round(widthPercentage)}%` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{data.shortlisted_candidates}</p>
          <p className="text-xs text-gray-600">Shortlisted</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {data.total_candidates > 0
              ? Math.round((data.shortlisted_candidates / data.total_candidates) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-600">Conversion Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {data.total_candidates > 0
              ? Math.round((data.parsed_candidates / data.total_candidates) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-600">Parse Success</p>
        </div>
      </div>
    </div>
  );
};

export default PipelineFunnel;
