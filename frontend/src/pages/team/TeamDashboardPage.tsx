import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/api/client";
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  FileText, 
  CheckCircle, 
  Calendar, 
  Award, 
  UserPlus,
  Star,
  ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardCard } from "../../components/dashboard/DashboardCard";

interface TeamKPIs {
  team_totals: any;
  kpis: any[];
  recent_activity?: any[];
}

export default function TeamDashboardPage() {
  const [data, setData] = useState<TeamKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/team-lead/kpis');
      setData(response.data);
    } catch (error) {
      toast.error("Failed to load team dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Mocking new KPIs from the blueprint if they aren't provided by the backend yet
  const totals = data.team_totals || {};
  const displayTotals = {
    assigned: totals.assigned_requirements || 0,
    open: totals.open_requirements || 0,
    recruiters: totals.recruiter_count || 0,
    sourced: totals.candidates_sourced || 0,
    submitted: totals.total_submissions || 0,
    client_approved: totals.client_approved || 0,
    interviews: totals.total_interviews || 0,
    offers: totals.offers || 0,
    joined: totals.joined || 0,
    placements: totals.placements || 0,
  };

  const mockActivity = data.recent_activity || [
    { id: 1, user: "Rahul", action: "submitted Candidate", time: "2 mins ago" },
    { id: 2, user: "John", action: "assigned Recruiter", time: "5 mins ago" },
    { id: 3, user: "Ajay", action: "approved Submission", time: "10 mins ago" },
    { id: 4, user: "System", action: "Interview Scheduled", time: "20 mins ago" },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Team Dashboard</h2>
        <p className="text-gray-500 mt-1">Operational metrics and team performance</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard title="Assigned Req" description="Active jobs" count={displayTotals.assigned} icon={Briefcase} color="blue" onClick={() => {}} />
        <DashboardCard title="Open Req" description="Open roles" count={displayTotals.open} icon={Briefcase} color="cyan" onClick={() => {}} />
        <DashboardCard title="Recruiters" description="Team members" count={displayTotals.recruiters} icon={Users} color="indigo" onClick={() => {}} />
        <DashboardCard title="Sourced" description="Candidates found" count={displayTotals.sourced} icon={UserPlus} color="purple" onClick={() => {}} />
        <DashboardCard title="Submitted" description="Sent to client" count={displayTotals.submitted} icon={FileText} color="blue" onClick={() => {}} />
        
        <DashboardCard title="Client Approved" description="Passed review" count={displayTotals.client_approved} icon={CheckCircle} color="green" onClick={() => {}} />
        <DashboardCard title="Interviews" description="Scheduled" count={displayTotals.interviews} icon={Calendar} color="orange" onClick={() => {}} />
        <DashboardCard title="Offers" description="Extended" count={displayTotals.offers} icon={Award} color="pink" onClick={() => {}} />
        <DashboardCard title="Joined" description="Started work" count={displayTotals.joined} icon={UserCheck} color="green" onClick={() => {}} />
        <DashboardCard title="Placements" description="Total hires" count={displayTotals.placements} icon={Star} color="orange" onClick={() => {}} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recruiter Performance Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Recruiter Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recruiter</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Reqs</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Sourced</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Interviews</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Offers</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Placed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.kpis.map((recruiter: any) => (
                  <tr key={recruiter.id || recruiter.recruiter_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{recruiter.name || recruiter.recruiter_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{recruiter.reqs || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{recruiter.activity_breakdown?.candidates_created || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{recruiter.submissions_count || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{recruiter.interviews_count || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{recruiter.offers || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{recruiter.placements || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* Hiring Funnel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Hiring Funnel</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-full bg-purple-100 text-purple-800 py-3 rounded-t-lg text-center font-bold relative">
                  Candidates Sourced ({displayTotals.sourced})
                  <ArrowRight className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 rotate-90 text-purple-300 w-5 h-5 z-10" />
                </div>
                <div className="w-11/12 bg-indigo-100 text-indigo-800 py-3 rounded text-center font-bold relative">
                  Submitted ({displayTotals.submitted})
                  <ArrowRight className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 rotate-90 text-indigo-300 w-5 h-5 z-10" />
                </div>
                <div className="w-5/6 bg-blue-100 text-blue-800 py-3 rounded text-center font-bold relative">
                  Client Approved ({displayTotals.client_approved})
                  <ArrowRight className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 rotate-90 text-blue-300 w-5 h-5 z-10" />
                </div>
                <div className="w-4/5 bg-cyan-100 text-cyan-800 py-3 rounded text-center font-bold relative">
                  Interview ({displayTotals.interviews})
                  <ArrowRight className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 rotate-90 text-cyan-300 w-5 h-5 z-10" />
                </div>
                <div className="w-3/4 bg-teal-100 text-teal-800 py-3 rounded text-center font-bold relative">
                  Offer ({displayTotals.offers})
                  <ArrowRight className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 rotate-90 text-teal-300 w-5 h-5 z-10" />
                </div>
                <div className="w-2/3 bg-green-100 text-green-800 py-3 rounded text-center font-bold relative">
                  Joined ({displayTotals.joined})
                  <ArrowRight className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 rotate-90 text-green-300 w-5 h-5 z-10" />
                </div>
                <div className="w-1/2 bg-emerald-500 text-white py-3 rounded-b-lg text-center font-bold">
                  Placed ({displayTotals.placements})
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                {mockActivity.map((act) => (
                  <div key={act.id} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-bold">{act.user}</span> {act.action}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
