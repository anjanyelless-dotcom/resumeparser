import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import HorizontalTabs from "../../components/layout/HorizontalTabs";

const tabs = [
  { id: 'recruitment-analytics', label: 'Recruitment Analytics' },
  { id: 'parser-analytics', label: 'Parser Analytics' },
  { id: 'ai-analytics', label: 'AI Analytics' },
  { id: 'company-analytics', label: 'Company Analytics' },
  { id: 'reports', label: 'Reports' },
  { id: 'audit-logs', label: 'Audit Logs' },
];

const tabRoutes: Record<string, string> = {
  'recruitment-analytics': '/analytics-reports/recruitment-analytics',
  'parser-analytics': '/analytics-reports/parser-analytics',
  'ai-analytics': '/analytics-reports/ai-analytics',
  'company-analytics': '/analytics-reports/company-analytics',
  'reports': '/analytics-reports/reports',
  'audit-logs': '/analytics-reports/audit-logs',
};

export default function AnalyticsReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('recruitment-analytics');

  useEffect(() => {
    const currentTab = Object.entries(tabRoutes).find(([_, route]) =>
      location.pathname === route || location.pathname.startsWith(route + '?')
    );
    if (currentTab) {
      setActiveTab(currentTab[0]);
    }
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(tabRoutes[tabId]);
  };

  return (
    <div className="p-6 min-h-full bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Recruitment insights, analytics and system reports
        </p>
      </div>

      <HorizontalTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
