import { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import api from '../../services/api';

import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  active_assignment_count: number;
  team_lead_id: string | null;
}

interface AssignRecruitersModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  assignedRecruiters?: { id: string; name: string }[];
  onAssign: () => void;
}

export default function AssignRecruitersModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  assignedRecruiters = [],
  onAssign,
}: AssignRecruitersModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedRecruiters, setSelectedRecruiters] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
      setSelectedRecruiters(new Set()); // Reset selections on open
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/my-team');
      setTeamMembers(response.data.team_members);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      toast.error('Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadyAssigned = (recruiterId: string) => {
    return assignedRecruiters.some(ar => ar.id === recruiterId);
  };

  const toggleRecruiter = (recruiterId: string) => {
    if (isAlreadyAssigned(recruiterId)) return; // Prevent selecting already assigned recruiters
    
    const newSelected = new Set(selectedRecruiters);
    if (newSelected.has(recruiterId)) {
      newSelected.delete(recruiterId);
    } else {
      newSelected.add(recruiterId);
    }
    setSelectedRecruiters(newSelected);
  };

  const handleAssign = async () => {
    if (selectedRecruiters.size === 0) {
      toast.error('Please select at least one recruiter');
      return;
    }

    setIsSubmitting(true);
    try {
      // Assign each selected recruiter to the job
      for (const recruiterId of selectedRecruiters) {
        await api.post(`/jobs/${jobId}/assign-recruiter`, {
          recruiter_id: recruiterId,
          priority,
        });
      }
      toast.success('Recruiters assigned successfully');
      onAssign();
      onClose();
    } catch (error: any) {
      console.error('Failed to assign recruiters:', error);
      toast.error(error.response?.data?.message || 'Failed to assign recruiters');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assign Recruiters</h2>
              <p className="text-sm text-gray-600">{jobTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Priority Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'urgent')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Team Members List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Recruiters
            </label>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading team members...</div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No team members found</div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const isAssigned = isAlreadyAssigned(member.id);
                  return (
                  <div
                    key={member.id}
                    onClick={() => toggleRecruiter(member.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                      isAssigned 
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : selectedRecruiters.has(member.id)
                          ? 'border-indigo-500 bg-indigo-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isAssigned
                          ? 'border-gray-400 bg-gray-200'
                          : selectedRecruiters.has(member.id)
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-gray-300'
                      }`}>
                        {(isAssigned || selectedRecruiters.has(member.id)) && (
                          <Check className={`w-3 h-3 ${isAssigned ? 'text-gray-500' : 'text-white'}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.email} {isAssigned && <span className="ml-2 text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Already Assigned</span>}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.active_assignment_count} active assignments
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs font-medium rounded ${
                      member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedRecruiters.size} recruiter{selectedRecruiters.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={isSubmitting || selectedRecruiters.size === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Recruiters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}