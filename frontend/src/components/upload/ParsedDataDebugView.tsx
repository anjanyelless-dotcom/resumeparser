import { useState } from 'react';
import React from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface ParsedDataDebugViewProps {
  data: any;
  candidateId?: string;
}

export default function ParsedDataDebugView({ data, candidateId }: ParsedDataDebugViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = (obj: any, indent = 0): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
  

    if (obj === null || obj === undefined) {
      return [<span key="null" className="text-gray-500">null</span>];
    }

    if (typeof obj !== 'object') {
      const className = 
        typeof obj === 'string' ? 'text-green-600' :
        typeof obj === 'number' ? 'text-blue-600' :
        typeof obj === 'boolean' ? 'text-purple-600' :
        'text-gray-600';
      
      return [
        <span key="value" className={className}>
          {typeof obj === 'string' ? `"${obj}"` : String(obj)}
        </span>
      ];
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return [<span key="empty-array" className="text-gray-500">[]</span>];
      }

      elements.push(
        <span key="array-start" className="text-gray-700">[</span>
      );

      obj.forEach((item, index) => {
        elements.push(
          <div key={`item-${index}`} className="ml-4">
            {formatJson(item, indent + 1)}
            {index < obj.length - 1 && <span className="text-gray-700">,</span>}
          </div>
        );
      });

      elements.push(
        <div key="array-end">
          <span className="text-gray-700">]</span>
        </div>
      );

      return elements;
    }

    // Object
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return [<span key="empty-object" className="text-gray-500">{'{}'}</span>];
    }

    elements.push(
      <span key="object-start" className="text-gray-700">{'{'}</span>
    );

    keys.forEach((key, index) => {
      elements.push(
        <div key={`key-${key}`} className="ml-4">
          <span className="text-red-600">"{key}"</span>
          <span className="text-gray-700">: </span>
          {formatJson(obj[key], indent + 1)}
          {index < keys.length - 1 && <span className="text-gray-700">,</span>}
        </div>
      );
    });

    elements.push(
      <div key="object-end">
        <span className="text-gray-700">{'}'}</span>
      </div>
    );

    return elements;
  };

  return (
    <div className="mt-6 bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-gray-700 rounded p-1 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
          <h3 className="font-mono font-semibold">
            🔍 Parsed Data Debug View
          </h3>
          {candidateId && (
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
              ID: {candidateId}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-white">
          {/* Quick Stats */}
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b border-gray-200">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-blue-600 font-medium">Skills</p>
              <p className="text-lg font-bold text-blue-900">
                {data?.skills?.length || 0}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-green-600 font-medium">Experience</p>
              <p className="text-lg font-bold text-green-900">
                {data?.work_experience?.length || 0}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-xs text-purple-600 font-medium">Education</p>
              <p className="text-lg font-bold text-purple-900">
                {data?.education?.length || 0}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-xs text-yellow-600 font-medium">Confidence</p>
              <p className="text-lg font-bold text-yellow-900">
                {data?.confidence?.overall 
                  ? `${Math.round(data.confidence.overall * 100)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* JSON Display */}
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="font-mono text-sm text-gray-100">
              <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
          </div>

          {/* Detailed Breakdown */}
          <div className="mt-4 space-y-4">
            {/* Contact Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📧 Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{data?.name || 'Not found'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{data?.email || 'Not found'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">{data?.phone || 'Not found'}</span>
                </div>
              </div>
            </div>

            {/* Work Experience */}
            {data?.work_experience && data.work_experience.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">💼 Work Experience ({data.work_experience.length})</h4>
                <div className="space-y-3">
                  {data.work_experience.map((exp: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="font-medium text-gray-900">
                        {exp.job_title || 'No title'} 
                        {exp.company_name && ` @ ${exp.company_name}`}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {exp.start_date || 'Unknown'} - {exp.end_date || 'Unknown'}
                        {exp.duration_months && ` (${exp.duration_months} months)`}
                      </div>
                      {exp.description && (
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {exp.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {data?.skills && data.skills.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🛠️ Skills ({data.skills.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {data.skills.slice(0, 20).map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                    >
                      {skill}
                    </span>
                  ))}
                  {data.skills.length > 20 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      +{data.skills.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {data?.education && data.education.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🎓 Education ({data.education.length})</h4>
                <div className="space-y-2">
                  {data.education.map((edu: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="font-medium text-gray-900">
                        {edu.degree || 'Unknown degree'}
                        {edu.field_of_study && ` in ${edu.field_of_study}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {edu.institution || 'Unknown institution'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {edu.start_year || '?'} - {edu.end_year || '?'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
