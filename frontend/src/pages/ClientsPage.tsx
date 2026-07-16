import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useClientStore } from "../store/useClientStore";
import toast from "react-hot-toast";
import { Building2, Search, RefreshCw, Plus, Archive } from "lucide-react";

export default function ClientsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { clients, pagination, isLoading, fetchClients } = useClientStore();
  const navigate = useNavigate();

  // Local input state — holds raw typed values before debounce commits them
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [inputIndustry, setInputIndustry] = useState("");
  const [inputCity, setInputCity] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const itemsPerPage = 20;

  // Debounce: commit local inputs to filter state 400 ms after the user stops typing
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchTerm(inputSearchTerm);
      setIndustry(inputIndustry);
      setCity(inputCity);
      setCurrentPage(1);
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputSearchTerm, inputIndustry, inputCity]);

  // Fetch clients when filters or pagination change
  useEffect(() => {
    loadClients();
  }, [currentPage, searchTerm, industry, city, showArchived]);

  const loadClients = async () => {
    await fetchClients({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      industry: industry || undefined,
      city: city || undefined,
      is_archived: showArchived ? true : undefined,
    });
  };

  const handleArchive = async (clientId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to archive ${companyName}?`)) return;

    try {
      await useClientStore.getState().archiveClient(clientId);
      toast.success(`${companyName} archived successfully`);
    } catch (error) {
      // Error already handled by store
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">
              {pagination?.total_items || 0} total clients
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/clients/new")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Industry Filter */}
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Industry..."
                value={inputIndustry}
                onChange={(e) => setInputIndustry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* City Filter */}
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="City..."
                value={inputCity}
                onChange={(e) => setInputCity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Show Archived Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show Archived</span>
            </label>

            {/* Refresh Button */}
            <button
              onClick={loadClients}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {clients.length} of {pagination?.total_items || 0} clients
            {pagination && ` (Page ${pagination.current_page} of ${pagination.total_pages})`}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && clients.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading clients...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || industry || city
                ? "Try adjusting your search filters"
                : "Get started by adding your first client"}
            </p>
            {!searchTerm && !industry && !city && (
              <button
                onClick={() => navigate("/admin/clients/new")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Your First Client
              </button>
            )}
          </div>
        )}

        {/* Clients Grid */}
        {!isLoading && clients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => navigate(`/admin/clients/${client.id}`)}
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{client.company_name}</h3>
                      {client.industry && (
                        <p className="text-sm text-gray-600">{client.industry}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(client.id, client.company_name);
                    }}
                    disabled={client.is_archived}
                    className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={client.is_archived ? "Already archived" : "Archive client"}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>

                {(client.city || client.country) && (
                  <p className="text-sm text-gray-600 mb-2">
                    {[client.city, client.country].filter(Boolean).join(", ")}
                  </p>
                )}

                {client.is_archived && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    Archived
                  </span>
                )}
              </div>
            ))}
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
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, pagination.total_pages) }).map((_, idx) => {
                let pageNum;
                if (pagination.total_pages <= 5) {
                  pageNum = idx + 1;
                } else if (pagination.current_page <= 3) {
                  pageNum = idx + 1;
                } else if (pagination.current_page >= pagination.total_pages - 2) {
                  pageNum = pagination.total_pages - 4 + idx;
                } else {
                  pageNum = pagination.current_page - 2 + idx;
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      pageNum === pagination.current_page
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(pagination.total_pages, prev + 1))}
                disabled={!pagination.has_next_page}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}