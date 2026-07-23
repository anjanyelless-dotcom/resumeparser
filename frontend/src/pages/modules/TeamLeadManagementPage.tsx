import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import HorizontalTabs from "../../components/layout/HorizontalTabs";

const tabs = [
  { id: 'assigned-jobs', label: 'Assigned Jobs' },
  { id: 'recruiter-assignment', label: 'Recruiter Assignment' },
  { id: 'submission-review', label: 'Submission Review' },
  { id: 'shortlist-review', label: 'Shortlist Review' },
  { id: 'team-dashboard', label: 'Team Dashboard' },
];

const tabRoutes: Record<string, string> = {
  'assigned-jobs': 'assigned-jobs',
  'recruiter-assignment': 'recruiter-assignment',
  'submission-review': 'submission-review',
  'shortlist-review': 'shortlist-review',
  'team-dashboard': 'team-dashboard',
};

export default function TeamLeadManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('assigned-jobs');

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const currentTab = Object.entries(tabRoutes).find(([_, route]) =>
      lastSegment === route
    );
    if (currentTab) {
      setActiveTab(currentTab[0]);
    } else if (location.pathname.endsWith('/team-lead-management')) {
      setActiveTab('assigned-jobs');
    }
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(tabRoutes[tabId]);
  };

  return (
    <div className="p-6 min-h-full bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Lead Management</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage team assignments, reviews and performance
        </p>
      </div>

      <HorizontalTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
