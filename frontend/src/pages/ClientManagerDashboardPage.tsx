import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClientManagerSummaryStore } from "../store/useClientManagerSummaryStore";
import { useCommunicationStore } from "../store/useCommunicationStore";
import { Building2, Briefcase, Users, Clock, Phone, Calendar, ArrowRight } from "lucide-react";

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export default function ClientManagerDashboardPage() {
  const navigate = useNavigate();
  const { summary, fetchSummary } = useClientManagerSummaryStore();
  const { followUps, getFollowUpsDue } = useCommunicationStore();

  useEffect(() => {
    fetchSummary();
    getFollowUpsDue();
  }, [fetchSummary, getFollowUpsDue]);

  const statCards: StatCard[] = [
    {
      title: "Assigned Clients",
      value: summary?.assignedClientsCount || 0,
      icon: <Building2 className="w-6 h-6" />,
      color: "bg-indigo-100 text-indigo-600",
      onClick: () => navigate("/admin/clients"),
    },
    {
      title: "Open Requirements",
      value: summary?.openRequirementsCount || 0,
      icon: <Briefcase className="w-6 h-6" />,
      color: "bg-blue-100 text-blue-600",
      onClick: () => navigate("/client-manager/requirements"),
    },
    {
      title: "Pending Feedback",
      value: summary?.pendingFeedbackCount || 0,
      icon: <Users className="w-6 h-6" />,
      color: "bg-green-100 text-green-600",
      onClick: () => navigate("/client-manager/submissions"),
    },
    {
      title: "Follow-ups Due",
      value: summary?.followUpsDueCount || 0,
      icon: <Clock className="w-6 h-6" />,
      color: "bg-orange-100 text-orange-600",
      onClick: () => navigate("/client-manager/requirements"),
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Client Manager Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's an overview of your clients and their requirements.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <button
              key={stat.title}
              onClick={stat.onClick}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/client-manager/requirements")}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Manage Requirements</p>
                  <p className="text-sm text-gray-600">View and clarify job requirements</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => navigate("/client-manager/submissions")}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Track Submissions</p>
                  <p className="text-sm text-gray-600">Review and record client decisions</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => navigate("/client-manager/interviews")}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Interview Coordination</p>
                  <p className="text-sm text-gray-600">Schedule and manage interviews</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Follow-ups Due Widget */}
        {followUps.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-medium text-orange-900">Follow-ups Due</h2>
                <span className="bg-orange-200 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {followUps.length}
                </span>
              </div>
              <button
                onClick={() => navigate("/client-manager/requirements")}
                className="text-sm text-orange-600 hover:text-orange-800 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {followUps.slice(0, 5).map((followUp) => (
                <div key={followUp.id} className="flex items-center justify-between p-3 bg-white rounded border border-orange-100">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{followUp.subject}</p>
                    <p className="text-xs text-gray-600">{followUp.company_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {followUp.contact_phone && (
                      <a
                        href={`tel:${followUp.contact_phone}`}
                        className="p-2 text-orange-600 hover:bg-orange-100 rounded"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {followUp.follow_up_date ? new Date(followUp.follow_up_date).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                </div>
              ))}
              {followUps.length > 5 && (
                <p className="text-xs text-orange-600 text-center">
                  +{followUps.length - 5} more follow-ups due
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty State for Follow-ups */}
        {followUps.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Follow-ups Due</h3>
              <p className="text-gray-600">
                You're all caught up! No pending follow-ups at the moment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}