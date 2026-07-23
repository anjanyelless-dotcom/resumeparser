import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import FilterBuilder from "../components/FilterBuilder";
import type { FilterCriteria } from "../components/FilterBuilder";
import { ArrowLeft, Copy, ExternalLink, Linkedin, Github, Globe } from "lucide-react";
import toast from "react-hot-toast";

interface XRayFilters {
  role?: string;
  skills?: string[];
  locations?: string[];
  experience?: string;
  currentCompany?: string[];
}

interface XRayLinks {
  linkedin: string;
  github: string;
  naukri: string;
  wellfound: string;
  combined: string;
}

interface XRayResponse {
  success: boolean;
  filters: XRayFilters;
  queries: XRayLinks;
  urls: XRayLinks;
}

const sourceIcons: Record<keyof XRayLinks, React.ReactNode> = {
  linkedin: <Linkedin className="h-5 w-5" />,
  github: <Github className="h-5 w-5" />,
  naukri: <Globe className="h-5 w-5" />,
  wellfound: <Globe className="h-5 w-5" />,
  combined: <ExternalLink className="h-5 w-5" />,
};

const sourceNames: Record<keyof XRayLinks, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  naukri: "Naukri",
  wellfound: "Wellfound",
  combined: "Combined Search",
};

export default function XRaySearchPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [xrayResults, setXrayResults] = useState<XRayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [emptySearchAttempted, setEmptySearchAttempted] = useState(false);

  const isFiltersEmpty = (criteria: FilterCriteria) => {
    return !criteria.role && 
           (!criteria.skills || criteria.skills.length === 0) &&
           criteria.minExperience === undefined &&
           criteria.maxExperience === undefined &&
           (!criteria.locations || criteria.locations.length === 0) &&
           (!criteria.education || criteria.education.length === 0) &&
           (!criteria.noticePeriod || criteria.noticePeriod.length === 0) &&
           (!criteria.currentCompany || criteria.currentCompany.length === 0) &&
           (!criteria.employmentType || criteria.employmentType.length === 0) &&
           !criteria.manualLocation &&
           !criteria.manualCompany &&
           !criteria.manualEducation;
  };

  const handleGenerateXRay = async () => {
    if (isFiltersEmpty(filters)) {
      setEmptySearchAttempted(true);
      setXrayResults(null);
      return;
    }
    
    setEmptySearchAttempted(false);
    try {
      setLoading(true);
      const response = await api.post<XRayResponse>("/candidates/xray-search", {
        role: filters.role,
        skills: filters.skills,
        locations: filters.locations,
        minExperience: filters.minExperience,
        maxExperience: filters.maxExperience,
        currentCompany: filters.currentCompany,
      });

      setXrayResults(response.data);
      toast.success("X-Ray search queries generated successfully!");
    } catch (error: any) {
      console.error("X-Ray search error:", error);
      toast.error(
        error.response?.data?.message || "Failed to generate X-Ray search queries"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleOpenInGoogle = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              X-Ray Search Generator
            </h1>
            <p className="text-sm text-slate-600">
              Generate Google X-Ray search queries for multiple platforms
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 p-6">
        {/* Filter Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            <FilterBuilder filters={filters} onChange={setFilters} />

            {/* Generate Button */}
            <button
              onClick={handleGenerateXRay}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 font-medium text-white transition hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                "Generate X-Ray Search"
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1">
          {loading && (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
            </div>
          )}

          {!loading && !xrayResults && emptySearchAttempted ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ExternalLink className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No X-Ray Queries Generated Yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Please provide at least one search criterion (e.g., Role, Skill, or Location) before generating X-Ray search queries.
              </p>
            </div>
          ) : !loading && !xrayResults && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ExternalLink className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No queries generated yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Set your filters and click "Generate X-Ray Search" to create search queries
              </p>
            </div>
          )}

          {!loading && xrayResults && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Generated Queries
                </h2>
                <p className="text-sm text-slate-600">
                  Click "Copy" to copy the query or "Open in Google" to search directly
                </p>
              </div>

              {(Object.keys(xrayResults.queries) as Array<keyof XRayLinks>).map(
                (source) => (
                  <div
                    key={source}
                    className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    {/* Source Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-full bg-brand-50 p-2 text-brand-600">
                          {sourceIcons[source]}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {sourceNames[source]}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(xrayResults.queries[source])}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                        <button
                          onClick={() => handleOpenInGoogle(xrayResults.urls[source])}
                          className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open in Google
                        </button>
                      </div>
                    </div>

                    {/* Query Text */}
                    <div className="rounded-lg bg-slate-900 p-4">
                      <code className="block text-sm font-mono text-green-400 whitespace-pre-wrap break-all">
                        {xrayResults.queries[source]}
                      </code>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}