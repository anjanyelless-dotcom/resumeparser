import React from 'react';

export interface DashboardCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  count?: number | string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink' | 'cyan';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    hover: 'hover:shadow-blue-200'
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    hover: 'hover:shadow-green-200'
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    hover: 'hover:shadow-purple-200'
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    hover: 'hover:shadow-orange-200'
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    hover: 'hover:shadow-red-200'
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    hover: 'hover:shadow-indigo-200'
  },
  pink: {
    bg: 'bg-pink-100',
    text: 'text-pink-600',
    hover: 'hover:shadow-pink-200'
  },
  cyan: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-600',
    hover: 'hover:shadow-cyan-200'
  }
};

export const DashboardCard: React.FC<DashboardCardProps> = ({
  icon: Icon,
  title,
  description,
  count,
  trend,
  onClick,
  color = 'indigo'
}) => {
  const colors = colorClasses[color];

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-lg shadow p-6 cursor-pointer
        hover:shadow-lg transition-all duration-200
        border border-gray-100 hover:border-gray-200
        min-h-[140px] flex flex-col justify-between
        ${colors.hover}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center flex-1">
          <div className={`flex-shrink-0 p-3 ${colors.bg} rounded-lg`}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 break-words">{title}</h3>
            <p className="text-xs text-gray-500 mt-1 break-words line-clamp-2">{description}</p>
          </div>
        </div>
        {count !== undefined && (
          <div className="text-right ml-4 flex-shrink-0">
            <p className="text-2xl font-bold text-gray-900 break-words">{count}</p>
            {trend && (
              <div className={`flex items-center mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <span className="text-xs font-medium">
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
