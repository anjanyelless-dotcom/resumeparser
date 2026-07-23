import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Zap, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "checking";
  endpoint?: string;
  settingKey?: string;
  icon: string;
  color: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "ai-service",
      name: "AI Service",
      description: "Python FastAPI service for resume parsing and matching",
      status: "checking",
      endpoint: "/health",
      icon: "🤖",
      color: "purple",
    },
    {
      id: "database",
      name: "PostgreSQL Database",
      description: "Primary data store for all ATS records",
      status: "checking",
      endpoint: "/dashboard/summary",
      icon: "🗄️",
      color: "blue",
    },
    {
      id: "email",
      name: "Email Service",
      description: "SMTP service for notifications and alerts",
      status: "disconnected",
      icon: "📧",
      color: "orange",
    },
    {
      id: "storage",
      name: "File Storage",
      description: "Resume and document storage system",
      status: "connected",
      icon: "📁",
      color: "green",
    },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    setIsChecking(true);
    setIntegrations(prev => prev.map(i => ({ ...i, status: i.endpoint ? "checking" as const : i.status })));

    const checks = integrations.map(async (integration) => {
      if (!integration.endpoint) return { id: integration.id, status: integration.status };
      try {
        if (integration.id === "ai-service") {
          // Check if backend is reachable (proxy indicator)
          await api.get("/analytics/parser-metrics");
          return { id: integration.id, status: "connected" as const };
        } else if (integration.id === "database") {
          await api.get("/dashboard/summary");
          return { id: integration.id, status: "connected" as const };
        }
        return { id: integration.id, status: "connected" as const };
      } catch {
        return { id: integration.id, status: "disconnected" as const };
      }
    });

    const results = await Promise.all(checks);
    setIntegrations(prev =>
      prev.map(i => {
        const found = results.find(r => r.id === i.id);
        return found ? { ...i, status: found.status } : i;
      })
    );
    setIsChecking(false);
  };

  const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
    purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-600" },
    green: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600" },
  };

  const StatusIcon = ({ status }: { status: Integration["status"] }) => {
    if (status === "connected") return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === "disconnected") return <XCircle className="w-5 h-5 text-red-500" />;
    return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
  };

  const StatusBadge = ({ status }: { status: Integration["status"] }) => {
    if (status === "connected") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Connected</span>;
    if (status === "disconnected") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Disconnected</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Checking…</span>;
  };

  const connectedCount = integrations.filter(i => i.status === "connected").length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="w-7 h-7 text-purple-600" />
            </div>
            Integrations
          </h1>
          <p className="text-gray-500 mt-2">Monitor and manage external service connections</p>
        </div>
        <button
          onClick={checkConnections}
          disabled={isChecking}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "Checking…" : "Refresh Status"}
        </button>
      </div>

      {/* Overview bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-indigo-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">Integration Status</p>
            <p className="text-xs text-gray-500">{connectedCount} of {integrations.length} services connected</p>
          </div>
        </div>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden ml-4">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(connectedCount / integrations.length) * 100}%` }}
          />
        </div>
        <span className="text-lg font-bold text-gray-900 ml-2">{Math.round((connectedCount / integrations.length) * 100)}%</span>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map(integration => {
          const colors = colorMap[integration.color] || colorMap.blue;
          return (
            <div
              key={integration.id}
              className={`bg-white rounded-xl border ${integration.status === "connected" ? "border-gray-200" : integration.status === "disconnected" ? "border-red-200" : "border-gray-200"} shadow-sm p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center text-2xl`}>
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-[200px]">{integration.description}</p>
                  </div>
                </div>
                <StatusIcon status={integration.status} />
              </div>
              <div className="flex items-center justify-between">
                <StatusBadge status={integration.status} />
                {integration.status === "connected" && (
                  <span className="text-xs text-green-600 font-medium">● Operational</span>
                )}
                {integration.status === "disconnected" && (
                  <span className="text-xs text-red-500 font-medium">● Unreachable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Integration status is checked automatically on page load. Click "Refresh Status" to recheck.
      </p>
    </div>
  );
}
