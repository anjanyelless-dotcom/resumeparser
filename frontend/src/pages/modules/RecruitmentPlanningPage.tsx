import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import HorizontalTabs from "../../components/layout/HorizontalTabs";

const tabs = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'team-lead-assignment', label: 'Team Lead Assignment' },
  { id: 'recruiter-assignment', label: 'Recruiter Assignment' },
  { id: 'requirement-approval', label: 'Requirement Approval' },
];

const tabRoutes: Record<string, string> = {
  'jobs': 'jobs',
  'team-lead-assignment': 'team-lead-assignment',
  'recruiter-assignment': 'recruiter-assignment',
  'requirement-approval': 'requirement-approval',
};

export default function RecruitmentPlanningPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('jobs');

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const currentTab = Object.entries(tabRoutes).find(([_, route]) =>
      lastSegment === route
    );
    if (currentTab) {
      setActiveTab(currentTab[0]);
    } else if (location.pathname.endsWith('/recruitment-planning')) {
      setActiveTab('jobs');
    }
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(tabRoutes[tabId]);
  };

  return (
    <div className="p-6 min-h-full bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment Planning</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage job openings, assignments and requirements
        </p>
      </div>

      <HorizontalTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
