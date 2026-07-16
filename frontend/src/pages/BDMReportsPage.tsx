import { useState, useEffect } from "react";
import { api } from "../services/api";
import { TrendingUp, Building2, DollarSign, Users } from "lucide-react";

interface ClientMetrics {
  id: string;
  company_name: string;
  total_requirements: number;
  total_submissions: number;
  total_interviews: number;
  total_placements: number;
  revenue: number;
}

export default function BDMReportsPage() {
  const [metrics, setMetrics] = useState<ClientMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // For now, use the clients endpoint to get basic client data
      // TODO: Implement /api/analytics/client-performance endpoint
      const response = await api.get('/clients');
      const clients = response.data.clients || [];
      
      // Transform to metrics format
      const metrics = clients.map((client: any) => ({
        id: client.id,
        company_name: client.company_name,
        total_requirements: 0, // Would need job data
        total_submissions: 0, // Would need submission data
        total_interviews: 0, // Would need interview data
        total_placements: 0, // Would need placement data
        revenue: 0, // Would need placement data
      }));
      
      setMetrics(metrics);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setMetrics([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const totalPlacements = metrics.reduce((sum, m) => sum + (m.total_placements || 0), 0);
  const totalSubmissions = metrics.reduce((sum, m) => sum + (m.total_submissions || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-2 text-gray-600">Track your client acquisition and performance metrics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text font-medium text-gray-600">Total Placements</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalPlacements}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalSubmissions}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.length}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Client Performance Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : metrics.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">No data available for selected date range</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requirements
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Placements
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Revenue/Placement
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.map((metric) => (
                    <tr key={metric.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {metric.company_name}
                      </td>
                      <td className="px-6 py-4 text-gray-900">{metric.total_requirements || 0}</td>
                      <td className="px-6 py-4 text-gray-900">{metric.total_submissions || 0}</td>
                      <td className="px-6 py-4 text-gray-900">{metric.total_placements || 0}</td>
                      <td className="px-6 py-4 text-gray-900">
                        ${metric.revenue?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        ${(metric.total_placements && metric.revenue 
                          ? (metric.revenue / metric.total_placements).toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
