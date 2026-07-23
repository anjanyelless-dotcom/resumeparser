import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import HorizontalTabs from "../../components/layout/HorizontalTabs";

const tabs = [
  { id: 'notifications', label: 'Notifications' },
  { id: 'settings', label: 'Settings' },
  { id: 'system-configuration', label: 'System Configuration' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'activity-logs', label: 'Activity Logs' },
  { id: 'backup-restore', label: 'Backup & Restore' },
];

const tabRoutes: Record<string, string> = {
  'notifications': '/administration/notifications',
  'settings': '/administration/settings',
  'system-configuration': '/administration/system-configuration',
  'integrations': '/administration/integrations',
  'activity-logs': '/administration/activity-logs',
  'backup-restore': '/administration/backup-restore',
};

export default function AdministrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('notifications');

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
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1 text-sm">
          System configuration, settings and administration
        </p>
      </div>

      <HorizontalTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
