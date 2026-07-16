import { useState, useEffect } from "react";
import { AlertTriangle, User, Mail, Phone, Briefcase, GraduationCap, Calendar, Info } from "lucide-react";
import Modal from "./common/Modal";
import { api } from "../services/api";
import toast from "react-hot-toast";

type DuplicateReviewModalProps = {
  open: boolean;
  onClose: () => void;
  duplicateGroup: {
    duplicate_relationship_id: string;
    similarity_score: number;
    candidate_1_id: string;
    candidate_1_name: string;
    candidate_1_email: string;
    candidate_2_id: string;
    candidate_2_name: string;
    candidate_2_email: string;
  } | null;
  onMerge: (primaryId: string, duplicateId: string) => void;
  onIgnore: (duplicateId: string) => void;
};

export default function DuplicateReviewModal({
  open,
  onClose,
  duplicateGroup,
  onMerge,
  onIgnore,
}: DuplicateReviewModalProps) {
  const [candidate1, setCandidate1] = useState<any>(null);
  const [candidate2, setCandidate2] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);

  useEffect(() => {
    if (open && duplicateGroup) {
      fetchCandidates();
    }
  }, [open, duplicateGroup]);

  const fetchCandidates = async () => {
    if (!duplicateGroup) return;
    
    setIsLoading(true);
    try {
      const [c1, c2] = await Promise.all([
        api.get(`/candidates/${duplicateGroup.candidate_1_id}`),
        api.get(`/candidates/${duplicateGroup.candidate_2_id}`)
      ]);
      
      setCandidate1(c1.data.candidate || c1.data);
      setCandidate2(c2.data.candidate || c2.data);
    } catch (error) {
      console.error("Failed to fetch candidate details", error);
      toast.error("Failed to fetch candidate details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!duplicateGroup || !selectedPrimary) return;
    
    const primaryId = selectedPrimary === "1" ? duplicateGroup.candidate_1_id : duplicateGroup.candidate_2_id;
    const duplicateId = selectedPrimary === "1" ? duplicateGroup.candidate_2_id : duplicateGroup.candidate_1_id;
    
    try {
      await api.post("/api/candidates/merge", { primaryId, duplicateId });
      toast.success("Candidates merged successfully");
      onMerge(primaryId, duplicateId);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to merge candidates");
    }
  };

  const handleIgnore = async () => {
    if (!duplicateGroup) return;
    
    try {
      await api.post("/api/candidates/ignore-duplicate", { duplicateRelationshipId: duplicateGroup.duplicate_relationship_id });
      toast.success("Duplicate marked as ignored");
      onIgnore(duplicateGroup.duplicate_relationship_id);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?. message || "Failed to ignore duplicate");
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-red-600 bg-red-50";
    if (score >= 80) return "text-orange-600 bg-orange-50";
    if (score >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <Modal open={open} onClose={onClose} title="Review Duplicate Candidates">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : duplicateGroup && candidate1 && candidate2 ? (
        <div className="space-y-6">
          {/* Similarity Score */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="font-medium text-gray-900">Potential Duplicate Detected</h3>
                <p className="text-sm text-gray-600">
                  Similarity Score: <span className={`font-bold ${getMatchScoreColor(duplicateGroup.similarity_score)}`}>
                    {duplicateGroup.similarity_score}%
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Candidate Comparison */}
          <div className="grid grid-cols-2 gap-6">
            {/* Candidate 1 */}
            <div className={`p-4 border-2 rounded-lg ${
              selectedPrimary === "1" ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Candidate 1</h4>
                <input
                  type="radio"
                  name="primary"
                  checked={selectedPrimary === "1"}
                  onChange={() => setSelectedPrimary("1")}
                  className="w-4 h-4 text-indigo-600"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{candidate1.full_name || candidate1.name}</p>
                  </div>
                </div>
                
                {candidate1.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{candidate1.email}</p>
                    </div>
                  </div>
                )}
                
                {candidate1.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{candidate1.phone}</p>
                    </div>
                  </div>
                )}

                {candidate1.current_company && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Current Company</p>
                      <p className="font-medium text-gray-900">{candidate1.current_company}</p>
                    </div>
                  </div>
                )}

                {candidate1.education && candidate1.education.length > 0 && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Education</p>
                      <p className="font-medium text-gray-900">{candidate1.education[0].degree}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-gray-900">
                      {new Date(candidate1.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate 2 */}
            <div className={`p-4 border-2 rounded-lg ${
              selectedPrimary === "2" ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Candidate 2</h4>
                <input
                  type="radio"
                  name="primary"
                  checked={selectedPrimary === "2"}
                  onChange={() => setSelectedPrimary("2")}
                  className="w-4 h-4 text-indigo-600"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{candidate2.full_name || candidate2.name}</p>
                  </div>
                </div>
                
                {candidate2.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{candidate2.email}</p>
                    </div>
                  </div>
                )}
                
                {candidate2.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{candidate2.phone}</p>
                    </div>
                  </div>
                )}

                {candidate2.current_company && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Current Company</p>
                      <p className="font-medium text-gray-900">{candidate2.current_company}</p>
                    </div>
                  </div>
                )}

                {candidate2.education && candidate2.education.length > 0 && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Education</p>
                      <p className="font-medium text-gray-900">{candidate2.education[0].degree}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-gray-900">
                      {new Date(candidate2.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">How to Resolve</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Select which candidate should be the primary record</li>
                <li>• Click "Merge" to combine the records (primary is kept, duplicate is removed)</li>
                <li>• Click "Ignore" to mark this as not a duplicate (both records kept)</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={handleIgnore}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Ignore Duplicate
            </button>
            <button
              onClick={handleMerge}
              disabled={!selectedPrimary}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Merge Candidates
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No duplicate data available</p>
      )}
    </Modal>
  );
}