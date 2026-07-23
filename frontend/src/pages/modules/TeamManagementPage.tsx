import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import HorizontalTabs from "../../components/layout/HorizontalTabs";

const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'roles-permissions', label: 'Roles & Permissions' },
  { id: 'submission-review-queue', label: 'Submission Review Queue' },
  { id: 'activity-timeline', label: 'Activity Timeline' },
  { id: 'departments', label: 'Departments' },
  { id: 'teams', label: 'Teams' },
];

const tabRoutes: Record<string, string> = {
  'users': '/team-management/users',
  'roles-permissions': '/team-management/roles-permissions',
  'submission-review-queue': '/team-management/submission-review-queue',
  'activity-timeline': '/team-management/activity-timeline',
  'departments': '/team-management/departments',
  'teams': '/team-management/teams',
};

export default function TeamManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('users');

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
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage users, roles, permissions and team structure
        </p>
      </div>

      <HorizontalTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
