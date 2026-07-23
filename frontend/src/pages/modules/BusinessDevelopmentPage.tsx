import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import HorizontalTabs from "../../components/layout/HorizontalTabs";

const tabs = [
  { id: 'client-pipeline', label: 'Client Pipeline' },
  { id: 'clients', label: 'Clients' },
  { id: 'bdm-requirements', label: 'BDM Requirements' },
  { id: 'requirement-approval', label: 'Requirement Approval' },
  { id: 'client-submission-tracking', label: 'Client Submission Tracking' },
];

const tabRoutes: Record<string, string> = {
  'client-pipeline': 'client-pipeline',
  'clients': 'clients',
  'bdm-requirements': 'bdm-requirements',
  'requirement-approval': 'requirement-approval',
  'client-submission-tracking': 'client-submission-tracking',
};

export default function BusinessDevelopmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('client-pipeline');

  useEffect(() => {
    // Determine active tab from current route (relative path)
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const currentTab = Object.entries(tabRoutes).find(([_, route]) =>
      lastSegment === route
    );
    if (currentTab) {
      setActiveTab(currentTab[0]);
    } else if (location.pathname.endsWith('/business-development')) {
      setActiveTab('client-pipeline');
    }
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(tabRoutes[tabId]);
  };

  return (
    <div className="p-6 min-h-full bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Development</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage clients, requirements and pipeline activities
        </p>
      </div>

      {/* Horizontal Tabs */}
      <HorizontalTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Content Area - Render nested routes */}
      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
