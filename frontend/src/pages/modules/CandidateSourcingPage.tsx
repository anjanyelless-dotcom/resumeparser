import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import HorizontalTabs from "../../components/layout/HorizontalTabs";
import { useRecruiterContextStore } from "../../store/useRecruiterContextStore";
import { Briefcase, X, Building2, Calendar, Target } from "lucide-react";

const tabs = [
  { id: 'boolean-search', label: 'Boolean Search' },
  { id: 'upload-resume', label: 'Upload Resume' },
  { id: 'resume-parsing', label: 'Resume Parsing' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'duplicate-candidates', label: 'Duplicate Candidates' },
];

const tabRoutes: Record<string, string> = {
  'boolean-search': 'boolean-search',
  'upload-resume': 'upload-resume',
  'resume-parsing': 'resume-parsing',
  'candidates': 'candidates',
  'duplicate-candidates': 'duplicate-candidates',
};

export default function CandidateSourcingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('boolean-search');

  const {
    currentRequirementId,
    currentRequirementTitle,
    currentClientName,
    currentPriority,
    currentDueDate,
    clearCurrentRequirement
  } = useRecruiterContextStore();

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const currentTab = Object.entries(tabRoutes).find(([_, route]) =>
      lastSegment === route
    );
    if (currentTab) {
      setActiveTab(currentTab[0]);
    } else if (location.pathname.endsWith('/candidate-sourcing')) {
      setActiveTab('boolean-search');
    }
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(tabRoutes[tabId]);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not Set";
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="p-6 min-h-full bg-gray-50 flex flex-col gap-6">

      {/* Current Requirement Context Banner */}
      {currentRequirementId && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg border-0 p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Target className="w-48 h-48 -mr-12 -mt-12" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-200 tracking-wider">ACTIVE REQUIREMENT</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentPriority?.toLowerCase() === 'high' ? 'bg-red-500/20 text-red-200 border border-red-500/30' :
                  currentPriority?.toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30' :
                    'bg-green-500/20 text-green-200 border border-green-500/30'
                }`}>
                {currentPriority || 'NORMAL'}
              </span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-200" />
              {currentRequirementTitle}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-indigo-100">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {currentClientName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Due: {formatDate(currentDueDate)}
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <button
              onClick={clearCurrentRequirement}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Clear Context
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Candidate Sourcing</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {currentRequirementId
            ? `Searching and uploading candidates for ${currentRequirementTitle}`
            : "Search, upload and manage candidate profiles across all jobs"}
        </p>
      </div>

      <HorizontalTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
