import { useState, useEffect } from "react";
import { useCompanyIntelStore } from "../store/useCompanyIntelStore";
import { Building2, Search, RefreshCw, Mail, Briefcase, TrendingUp, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

export default function CompanyIntelPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState<number | "">("");
  const [hiringStatusFilter, setHiringStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    companies,
    currentCompany,
    contacts,
    jobs,
    scrapeJob,
    hiringScoreBreakdown,
    isLoading,
    isScanning,
    pagination,
    scanCompany,
    fetchCompany,
    fetchCompanies,
    rescanCompany,
  } = useCompanyIntelStore();

  useEffect(() => {
    loadCompanies();
  }, [currentPage, industryFilter, minScoreFilter, hiringStatusFilter]);

  const loadCompanies = async () => {
    await fetchCompanies({
      page: currentPage,
      limit: 20,
      search: searchTerm || undefined,
      industry: industryFilter || undefined,
      minScore: minScoreFilter !== "" ? Number(minScoreFilter) : undefined,
      hiringStatus: hiringStatusFilter || undefined,
    });
  };

  const handleScan = async () => {
    if (!websiteUrl.trim()) return;
    
    try {
      const result = await scanCompany(websiteUrl);
      setView("detail");
      await fetchCompany(result.companyId);
      setWebsiteUrl("");
    } catch (error) {
      // Error handled by store
    }
  };

  const handleCompanyClick = async (companyId: string) => {
    setView("detail");
    await fetchCompany(companyId);
  };

  const handleRescan = async () => {
    if (!currentCompany) return;
    try {
      await rescanCompany(currentCompany.id);
    } catch (error) {
      // Error handled by store
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 25) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getHiringStatusColor = (status?: string) => {
    switch (status) {
      case "actively_hiring":
        return "bg-green-100 text-green-800";
      case "hiring":
        return "bg-blue-100 text-blue-800";
      case "occasionally_hiring":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelStatus = (level: string) => {
    if (!scrapeJob) return "pending";
    
    const levelOrder = ["pending", "level1", "level2", "level3", "level4", "level5"];
    const currentLevelIndex = levelOrder.indexOf(scrapeJob.level_reached);
    const targetLevelIndex = levelOrder.indexOf(level);
    
    if (currentLevelIndex >= targetLevelIndex) {
      if (scrapeJob.status === "failed") return "error";
      if (scrapeJob.status === "partial") return "warning";
      return "success";
    }
    return "pending";
  };

  const LevelIndicator = ({ level, label }: { level: string; label: string }) => {
    const status = getLevelStatus(level);
    
    return (
      <div className="flex items-center gap-2">
        {status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {status === "warning" && <AlertCircle className="w-5 h-5 text-yellow-500" />}
        {status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
        {status === "pending" && <Clock className="w-5 h-5 text-gray-400" />}
        <span className="text-sm">{label}</span>
      </div>
    );
  };

  if (view === "detail" && currentCompany) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            ← Back to Companies
          </button>

          {/* Company Details - Smart Auto-Fill Style */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Company Name</div>
                <div className="text-sm font-medium text-gray-900">{currentCompany.name || 'Not found'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Website URL</div>
                {currentCompany.website ? (
                  <a href={currentCompany.website} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800">
                    {currentCompany.website}
                  </a>
                ) : (
                  <div className="text-sm text-gray-400">Not found</div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">LinkedIn URL</div>
                {currentCompany.linkedin_url ? (
                  <a href={currentCompany.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800">
                    {currentCompany.linkedin_url}
                  </a>
                ) : (
                  <div className="text-sm text-gray-400">Not found</div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Company Size</div>
                <div className="text-sm text-gray-900">{currentCompany.company_size || 'Not found'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Industry</div>
                <div className="text-sm text-gray-900">{currentCompany.industry || 'Not found'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Hiring Status</div>
                {currentCompany.hiring_status ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHiringStatusColor(currentCompany.hiring_status)}`}>
                    {currentCompany.hiring_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ) : (
                  <div className="text-sm text-gray-400">Not found</div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Hiring Score</div>
                {currentCompany.hiring_score !== null && currentCompany.hiring_score !== undefined ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreBadgeColor(currentCompany.hiring_score)}`}>
                    {currentCompany.hiring_score}/100
                  </span>
                ) : (
                  <div className="text-sm text-gray-400">Not found</div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Career Page URL</div>
                {currentCompany.career_url ? (
                  <a href={currentCompany.career_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800">
                    {currentCompany.career_url}
                  </a>
                ) : (
                  <div className="text-sm text-gray-400">Not found</div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">Last Scanned</div>
                <div className="text-sm text-gray-900">
                  {currentCompany.last_scraped_at ? new Date(currentCompany.last_scraped_at).toLocaleString() : 'Never'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">ATS Provider</div>
                <div className="text-sm text-gray-900">{(currentCompany as any).ats_provider || 'Not found'}</div>
              </div>
            </div>
          </div>

          {/* Header with Rescan Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentCompany.name}</h1>
              <p className="text-gray-600 mt-1">{currentCompany.website}</p>
            </div>
            <button
              onClick={handleRescan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Rescan
                </>
              )}
            </button>
          </div>

          {/* Scan Progress */}
          {isScanning && scrapeJob && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Scan Progress</h3>
              <div className="grid grid-cols-5 gap-4">
                <LevelIndicator level="level1" label="Website Analysis" />
                <LevelIndicator level="level2" label="Career Detection" />
                <LevelIndicator level="level3" label="ATS Detection" />
                <LevelIndicator level="level4" label="AI Analysis" />
                <LevelIndicator level="level5" label="Hiring Score" />
              </div>
              {scrapeJob.error_message && (
                <div className="mt-3 text-sm text-red-600">
                  {scrapeJob.error_message}
                </div>
              )}
            </div>
          )}

          {/* Score Breakdown */}
          {hiringScoreBreakdown && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Hiring Score Breakdown
              </h2>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{hiringScoreBreakdown.careerPageExists || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Career Page</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{hiringScoreBreakdown.hrEmailExists || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">HR Email</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{hiringScoreBreakdown.openJobsScore || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Open Jobs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{hiringScoreBreakdown.linkedinExists || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">LinkedIn</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{hiringScoreBreakdown.recentJobsScore || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Recent Jobs</div>
                </div>
              </div>
            </div>
          )}

          {/* Contacts */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contacts ({contacts.length})
            </h2>
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">{contact.contact_type}</div>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-sm text-indigo-600 hover:text-indigo-800">
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-sm text-gray-600 ml-2">
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No contacts found</div>
            )}
          </div>

          {/* Open Jobs */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Open Jobs ({jobs.length})
            </h2>
            {jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {job.location && <span>{job.location}</span>}
                        {job.experience_level && <span className="ml-2">• {job.experience_level}</span>}
                        {job.posted_date && <span className="ml-2">• Posted {new Date(job.posted_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    {job.job_url && (
                      <a
                        href={job.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                      >
                        View Job
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No open jobs found</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Intelligence</h1>
            <p className="text-gray-600 mt-1">
              {pagination?.total || 0} companies scanned
            </p>
          </div>
        </div>

        {/* Scan Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex gap-4">
            <input
              type="url"
              placeholder="Paste company website URL (e.g., https://example.com)"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isScanning}
            />
            <button
              onClick={handleScan}
              disabled={isScanning || !websiteUrl.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Company name or website"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                placeholder="Filter by industry"
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Score</label>
              <input
                type="number"
                placeholder="0-100"
                min="0"
                max="100"
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hiring Status</label>
              <select
                value={hiringStatusFilter}
                onChange={(e) => setHiringStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All</option>
                <option value="not_hiring">Not Hiring</option>
                <option value="hiring">Hiring</option>
                <option value="actively_hiring">Actively Hiring</option>
                <option value="occasionally_hiring">Occasionally Hiring</option>
              </select>
            </div>
          </div>
        </div>

        {/* Companies List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No companies found. Scan a company website to get started.</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hiring Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Scanned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      onClick={() => handleCompanyClick(company.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{company.name}</div>
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-gray-500 hover:text-indigo-600"
                            >
                              {company.website}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{company.industry || "-"}</td>
                      <td className="px-6 py-4">
                        {company.hiring_score !== null && company.hiring_score !== undefined ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreBadgeColor(company.hiring_score)}`}>
                            {company.hiring_score}/100
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {company.hiring_status ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHiringStatusColor(company.hiring_status)}`}>
                            {company.hiring_status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {company.last_scraped_at ? new Date(company.last_scraped_at).toLocaleDateString() : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} companies
                  </div>
                  <div className="flex gap-2"> || 0 || 0
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
