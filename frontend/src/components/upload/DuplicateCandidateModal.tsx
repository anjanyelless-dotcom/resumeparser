import { useState, useEffect } from "react";
import { AlertTriangle, User, Mail, Phone, Briefcase, GraduationCap, Calendar, Info } from "lucide-react";
import Modal from "../common/Modal";
import { api } from "../../services/api";

type DuplicateCandidateModalProps = {
  open: boolean;
  onClose: () => void;
  errorData: {
    message: string;
    field: string;
    existingCandidateId: string;
    existingCandidateName: string;
  } | null;
  newCandidateData: any;
  onSaveAsNew: () => void;
  onViewExisting: (id: string) => void;
  onUpdateExisting: (id: string) => void;
};

export default function DuplicateCandidateModal({
  open,
  onClose,
  errorData,
  newCandidateData,
  onSaveAsNew,
  onViewExisting,
  onUpdateExisting,
}: DuplicateCandidateModalProps) {
  const [existingCandidate, setExistingCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && errorData?.existingCandidateId) {
      fetchExistingCandidate(errorData.existingCandidateId);
    }
  }, [open, errorData]);

  const fetchExistingCandidate = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/candidates/${id}`);
      setExistingCandidate(response.data.candidate || response.data);
    } catch (error) {
      console.error("Failed to fetch existing candidate details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMatchScore = () => {
    // Mock match score based on the matching field
    if (errorData?.field === "resume_hash") return "100%";
    if (errorData?.field === "name+email" || errorData?.field === "name+phone") return "95%";
    if (errorData?.field === "email" || errorData?.field === "phone") return "90%";
    return "85%";
  };

  const getMatchCriteria = () => {
    const criteria = [];
    const field = errorData?.field || "";
    
    if (field.includes("email")) {
      criteria.push("Same Email Address");
    }
    if (field.includes("phone")) {
      criteria.push("Same Phone Number");
    }
    if (field.includes("name") || field === "email" || field === "phone") {
      criteria.push("Similar Name");
    }
    if (field === "linkedin_url") {
      criteria.push("Same LinkedIn URL");
    }
    if (field === "resume_hash") {
      criteria.push("Same Resume Document");
    }
    
    if (criteria.length === 0) {
      criteria.push("Matching Details");
    }
    return criteria;
  };

  const getPrimaryDegree = (education: any[]) => {
    if (!education || !Array.isArray(education) || education.length === 0) return "N/A";
    return education[0].degree || education[0].degree_name || "N/A";
  };

  const formatExp = (expText: string | null | undefined, expYears?: number) => {
    if (expYears !== undefined && expYears !== null) {
      return `${expYears} Years`;
    }
    if (expText && expText.toLowerCase().includes("year")) {
      // Just extract a simple snippet if it's text
      const match = expText.match(/(\d+(\.\d+)?)\s*(years?|yrs?)/i);
      return match ? match[0] : "Experience listed";
    }
    return "N/A";
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Unknown";
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (!open || !errorData) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-[850px] max-h-[85vh] bg-white rounded-xl flex flex-col">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 p-5 border-b border-slate-100">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 p-3 bg-amber-100 text-amber-500 rounded-full">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Duplicate Candidate Detected</h2>
              <p className="text-sm text-slate-600">A candidate with matching details already exists in the system.</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Match Criteria Panel */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mb-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-amber-800 text-sm">Match Criteria</h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                Match Score: {calculateMatchScore()}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {getMatchCriteria().map((criterion, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-green-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</div>
                  {criterion}
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
            {/* Existing Candidate */}
            <div className="space-y-3 relative pr-3">
              <div className="absolute right-0 top-0 bottom-0 w-px bg-slate-100 hidden md:block"></div>
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Existing Candidate</h3>
              
              {isLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : existingCandidate ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{existingCandidate.full_name || existingCandidate.name}</h4>
                      <p className="text-xs text-slate-500">Added on {formatDate(existingCandidate.created_at)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{existingCandidate.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{existingCandidate.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>{existingCandidate.total_experience_years ? `${existingCandidate.total_experience_years} Years` : "Experience listed"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>{getPrimaryDegree(existingCandidate.education)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(existingCandidate.created_at)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 italic text-xs">Could not load details.</p>
              )}
            </div>

            {/* New Upload */}
            <div className="space-y-3 pl-0 md:pl-3">
              <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3">New Upload (Current)</h3>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{newCandidateData?.name || newCandidateData?.full_name || "Unknown"}</h4>
                  <p className="text-xs text-slate-500">Uploading now</p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{newCandidateData?.email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{newCandidateData?.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatExp(newCandidateData?.summary)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{getPrimaryDegree(newCandidateData?.education)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons - Sticky */}
        <div className="flex-shrink-0 p-5 border-t border-slate-100 bg-white">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button 
              onClick={() => onViewExisting(errorData.existingCandidateId)}
              className="flex flex-col items-center justify-center px-4 py-2.5 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <Info className="w-3.5 h-3.5" /> View Existing
              </span>
              <span className="text-xs opacity-75">Open candidate details</span>
            </button>
            
            <button 
              onClick={() => onUpdateExisting(errorData.existingCandidateId)}
              className="flex flex-col items-center justify-center px-4 py-2.5 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="font-bold flex items-center gap-1.5 text-sm">
                ↑ Update Existing
              </span>
              <span className="text-xs opacity-75">Replace with new resume</span>
            </button>
            
            <button 
              onClick={onSaveAsNew}
              className="flex flex-col items-center justify-center px-4 py-2.5 border border-green-200 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="font-bold flex items-center gap-1.5 text-sm">
                ↑ Save As New
              </span>
              <span className="text-xs opacity-75">Create new candidate</span>
            </button>
            
            <button 
              onClick={onClose}
              className="flex flex-col items-center justify-center px-4 py-2.5 border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <span className="font-bold flex items-center gap-1.5 text-sm">
                ✕ Cancel
              </span>
              <span className="text-xs opacity-75">Go back without saving</span>
            </button>
          </div>

          {/* Info panel */}
          <div className="flex items-center gap-2 p-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs mt-3">
            <Info className="w-4 h-4 flex-shrink-0" />
            <p>No changes have been made to the database.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
