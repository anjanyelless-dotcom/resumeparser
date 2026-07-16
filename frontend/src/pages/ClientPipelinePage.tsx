import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClientStore } from "../store/useClientStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { Building2, Plus, ArrowRight, ChevronRight, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import type { Client } from "../store/useClientStore";

const PIPELINE_STAGES = [
  { key: 'prospect', label: 'Prospect', color: 'bg-gray-100 border-gray-300' },
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-100 border-blue-300' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: 'bg-yellow-100 border-yellow-300' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 border-orange-300' },
  { key: 'won', label: 'Won', color: 'bg-green-100 border-green-300' },
  { key: 'lost', label: 'Lost', color: 'bg-red-100 border-red-300' },
];

export default function ClientPipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clients, fetchClients } = useClientStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    company_name: '',
    industry: '',
    city: '',
    country: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      // Fetch all clients and filter by owner_user_id = current user
      await fetchClients({ limit: 1000 });
      console.log("Clients loaded successfully, count:", clients.length);
      console.log("Client pipeline stages:", clients.map(c => ({ 
        id: c.id, 
        company_name: c.company_name, 
        pipeline_stage: c.pipeline_stage 
      })));
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter clients owned by current user
  const myClients = clients.filter(client => 
    client.owner_user_id === user?.id && !client.is_archived
  );

  // Group clients by pipeline stage
  const clientsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    // Handle missing pipeline_stage by treating it as 'prospect'
    const stageClients = myClients.filter(client => 
      (client.pipeline_stage || 'prospect') === stage.key
    );
    console.log(`Stage '${stage.key}':`, stageClients.length, "clients:", stageClients.map(c => c.company_name));
    acc[stage.key] = stageClients;
    return acc;
  }, {} as Record<string, Client[]>);

  const moveClientToNextStage = async (client: Client) => {
    const currentStage = client.pipeline_stage || 'prospect';
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === currentStage);
    if (currentIndex === -1 || currentIndex === PIPELINE_STAGES.length - 1) {
      toast.error("Cannot move from this stage");
      return;
    }

    const nextStage = PIPELINE_STAGES[currentIndex + 1];
    console.log("Moving client:", client.company_name, "from", currentStage, "to", nextStage.key);
    
    try {
      const response = await api.patch(`/clients/${client.id}/pipeline-stage`, {
        stage: nextStage.key,
        notes: `Moved from ${currentStage} to ${nextStage.key}`,
      });
      
      console.log("API response:", response.data);
      toast.success(`${client.company_name} moved to ${nextStage.label}`);
      
      await loadClients();
      console.log("Clients reloaded after pipeline update");
    } catch (error: any) {
      console.error("Failed to move client:", error);
      toast.error(error.response?.data?.message || "Failed to move client");
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
        owner_user_id: user?.id, // Pre-fill owner to self
      });
      
      toast.success("Client created successfully");
      setShowNewClientModal(false);
      setNewClientData({ company_name: '', industry: '', city: '', country: '' });
      await loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create client");
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Pipeline</h1>
            <p className="text-gray-600 mt-1">
              {myClients.length} clients in your pipeline
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
            <button
              onClick={() => setShowNewClientModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Client
            </button>
          </div>
        </div>

        {/* Pipeline Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.key} className={`flex-shrink-0 w-80 ${stage.color} border-2 rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{stage.label}</h2>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium">
                  {clientsByStage[stage.key]?.length || 0}
                </span>
              </div>

              <div className="space-y-3">
                {clientsByStage[stage.key]?.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => navigate(`/bdm/clients/${client.id}`)}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{client.company_name}</h3>
                        {client.industry && (
                          <p className="text-sm text-gray-600">{client.industry}</p>
                        )}
                        {(client.city || client.country) && (
                          <p className="text-xs text-gray-500">
                            {client.city}{client.city && client.country ? ', ' : ''}{client.country}
                          </p>
                        )}
                      </div>
                    </div>

                    {client.expected_deal_value && (
                      <p className="text-sm font-medium text-green-600 mb-2">
                        ${client.expected_deal_value.toLocaleString()}
                      </p>
                    )}

                    {client.source && (
                      <p className="text-xs text-gray-500 mb-3">
                        Source: {client.source}
                      </p>
                    )}

                    {stage.key !== 'won' && stage.key !== 'lost' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveClientToNextStage(client);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        Move to Next
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {clientsByStage[stage.key]?.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No clients in this stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {myClients.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients in your pipeline</h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first client
            </p>
            <button
              onClick={() => setShowNewClientModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Your First Client
            </button>
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">New Client</h2>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={newClientData.company_name}
                  onChange={(e) => setNewClientData({ ...newClientData, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={newClientData.industry}
                  onChange={(e) => setNewClientData({ ...newClientData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={newClientData.city}
                  onChange={(e) => setNewClientData({ ...newClientData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={newClientData.country}
                  onChange={(e) => setNewClientData({ ...newClientData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Country"
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
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}