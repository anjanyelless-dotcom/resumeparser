import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useClientStore } from "../store/useClientStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { Building2, Plus, ChevronRight, RefreshCw, Search, ArrowRight } from "lucide-react";
import { api } from "../services/api";
import type { Client } from "../store/useClientStore";

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-purple-100 text-purple-800' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
  { key: 'won', label: 'Won', color: 'bg-green-100 text-green-800' },
  { key: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
];

export default function ClientPipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clients, fetchClients, pagination, isLoading, convertClientToActive } = useClientStore();
  
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    company_name: '',
    industry: '',
    city: '',
    country: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputSearchTerm, setInputSearchTerm] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);
  const itemsPerPage = 20;

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputSearchTerm]);

  useEffect(() => {
    loadClients();
  }, [currentPage, searchTerm]);

  const loadClients = async () => {
    try {
      await fetchClients({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        status: 'pipeline',
      });
    } catch (error) {
      console.error("Failed to load clients:", error);
    }
  };

  const getStageDisplay = (stageKey: string) => {
    const stage = PIPELINE_STAGES.find(s => s.key === stageKey);
    return stage || PIPELINE_STAGES[0];
  };

  const moveClientToNextStage = async (client: Client) => {
    const currentStage = client.pipeline_stage || 'lead';
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === currentStage);
    if (currentIndex === -1 || currentIndex >= PIPELINE_STAGES.length - 2) {
      toast.error("Cannot move from this stage via 'Next' button");
      return;
    }

    const nextStage = PIPELINE_STAGES[currentIndex + 1];
    try {
      await api.patch(`/clients/${client.id}/pipeline-stage`, {
        stage: nextStage.key,
        notes: `Moved from ${currentStage} to ${nextStage.key}`,
      });
      toast.success(`${client.company_name} moved to ${nextStage.label}`);
      await loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to move client");
    }
  };

  const handleConvertClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to convert this pipeline lead to an active client?")) return;
    try {
      await convertClientToActive(clientId);
      await loadClients(); // Refresh list to remove from pipeline
    } catch (e) {
      // Error handled by store
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }

    try {
      await api.post('/clients', {
        ...newClientData,
        owner_user_id: user?.id,
      });
      toast.success("Pipeline Client created successfully");
      setShowNewClientModal(false);
      setNewClientData({ company_name: '', industry: '', city: '', country: '' });
      await loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create client");
    }
  };

  return (
    <div className="p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Pipeline</h1>
            <p className="text-gray-600 mt-1">
              {pagination?.total_items || 0} active prospects in pipeline
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadClients}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by company name..."
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && clients.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading pipeline...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No prospects found</h3>
            <p className="text-gray-600 mb-4">
              Your pipeline is currently empty
            </p>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && clients.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pipeline ID</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned BDM</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Follow-up</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => {
                    const stage = getStageDisplay(client.pipeline_stage || 'lead');
                    return (
                      <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/bdm/clients/${client.id}`)}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.id.split('-')[0]}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{client.company_name}</div>
                          {client.industry && <div className="text-sm text-gray-500">{client.industry}</div>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(client as any).primary_contact_name || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(client as any).primary_contact_email || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(client as any).primary_contact_phone || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.owner_user_id === user?.id ? "You" : "Other"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stage.color}`}>
                            {stage.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(client as any).next_follow_up ? new Date((client as any).next_follow_up).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {client.status}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          {client.pipeline_stage === 'won' ? (
                            <button
                              onClick={() => handleConvertClient(client.id)}
                              className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-xs"
                            >
                              Convert to Client
                            </button>
                          ) : client.pipeline_stage !== 'lost' && client.pipeline_stage !== 'won' ? (
                            <button
                              onClick={() => moveClientToNextStage(client)}
                              className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end w-full"
                            >
                              Move Next <ArrowRight className="w-4 h-4 ml-1" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600">
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={!pagination.has_prev_page}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(pagination.total_pages, prev + 1))}
                disabled={!pagination.has_next_page}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">New Prospect</h2>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newClientData.company_name}
                  onChange={(e) => setNewClientData({ ...newClientData, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input
                  type="text"
                  value={newClientData.industry}
                  onChange={(e) => setNewClientData({ ...newClientData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={newClientData.city}
                  onChange={(e) => setNewClientData({ ...newClientData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={newClientData.country}
                  onChange={(e) => setNewClientData({ ...newClientData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}