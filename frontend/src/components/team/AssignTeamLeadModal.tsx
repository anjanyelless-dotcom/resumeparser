import { useState, useEffect } from "react";
import { X, Search, Check, AlertCircle } from "lucide-react";
import { api } from "../../services/api";
import toast from "react-hot-toast";

interface AssignTeamLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  currentTeamLeadId?: string;
  onAssign: () => void;
}

interface TeamLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  active_assignments?: number;
}

export default function AssignTeamLeadModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  currentTeamLeadId,
  onAssign,
}: AssignTeamLeadModalProps) {
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeamLeads();
      setSelectedLeadId(currentTeamLeadId || null);
    }
  }, [isOpen, currentTeamLeadId]);

  const fetchTeamLeads = async () => {
    try {
      setLoading(true);
      // Assuming a generic users endpoint exists, we fetch team leads
      const response = await api.get("/users?role=team_lead");
      // Fallback to response.data or response.data.users
      setTeamLeads(response.data?.users || response.data || []);
    } catch (error) {
      console.error("Failed to fetch team leads:", error);
      toast.error("Failed to load team leads");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedLeadId) {
      toast.error("Please select a team lead");
      return;
    }

    try {
      setAssigning(true);
      await api.post(`/jobs/${jobId}/assign-team-lead`, {
        team_lead_id: selectedLeadId,
      });
      toast.success("Team lead assigned successfully");
      onAssign();
      onClose();
    } catch (error: any) {
      console.error("Failed to assign team lead:", error);
      toast.error(error.response?.data?.details || error.response?.data?.error || "Failed to assign team lead");
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  const filteredLeads = teamLeads.filter(
    (lead) =>
      `${lead.first_name || ''} ${lead.last_name || ''} ${lead.email || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Assign Team Lead
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Assigning team lead for <span className="font-semibold text-gray-900">{jobTitle}</span>
              </p>
            </div>

            <div className="relative mb-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Search team leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading team leads...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No team leads found
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <li
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`cursor-pointer p-4 hover:bg-gray-50 flex items-center justify-between ${
                        selectedLeadId === lead.id ? "bg-indigo-50" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{lead.email}</p>
                      </div>
                      {selectedLeadId === lead.id && (
                        <Check className="h-5 w-5 text-indigo-600" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {currentTeamLeadId && selectedLeadId !== currentTeamLeadId && (
              <div className="mt-4 flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>
                  This job is already assigned to a team lead. Saving will reassign it.
                </p>
              </div>
            )}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              onClick={handleAssign}
              disabled={assigning || !selectedLeadId || selectedLeadId === currentTeamLeadId}
            >
              {assigning ? "Assigning..." : "Assign"}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
