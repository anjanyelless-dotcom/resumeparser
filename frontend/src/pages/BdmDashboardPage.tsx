import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Briefcase, TrendingUp, ArrowRight } from "lucide-react";
import { api } from "../services/api";
import toast from "react-hot-toast";

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface BDMSummary {
  newClientsThisMonth: number;
  openOpportunitiesCount: number;
  revenueGeneratedThisMonth: number;
}

export default function BdmDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<BDMSummary | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get("/dashboard/bdm-summary");
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch BDM summary:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const statCards: StatCard[] = [
    {
      title: "New Clients This Month",
      value: summary?.newClientsThisMonth || 0,
      icon: <Building2 className="w-6 h-6" />,
      color: "bg-green-100 text-green-600",
      onClick: () => navigate("/bdm/pipeline"),
    },
    {
      title: "Open Opportunities",
      value: summary?.openOpportunitiesCount || 0,
      icon: <Briefcase className="w-6 h-6" />,
      color: "bg-blue-100 text-blue-600",
      onClick: () => navigate("/bdm/pipeline"),
    },
    {
      title: "Revenue This Month",
      value: summary?.revenueGeneratedThisMonth || 0,
      icon: <TrendingUp className="w-6 h-6" />,
      color: "bg-purple-100 text-purple-600",
      onClick: () => navigate("/bdm/requirements"),
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">BDM Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's an overview of your pipeline and performance.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.title === "Revenue This Month" 
                      ? `$${stat.value.toLocaleString()}` 
                      : stat.value}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/bdm/pipeline")}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Pipeline Board</p>
                  <p className="text-sm text-gray-600">Manage client pipeline stages</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => navigate("/bdm/requirements")}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Requirements</p>
                  <p className="text-sm text-gray-600">View and create job requirements</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}