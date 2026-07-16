import { useState } from 'react';
import { X, Check, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  candidateName: string;
  jobTitle: string;
  onReview: (submissionId: string, decision: string, notes: string) => Promise<void>;
}

export default function ReviewSubmissionModal({
  isOpen,
  onClose,
  submissionId,
  candidateName,
  jobTitle,
  onReview,
}: ReviewSubmissionModalProps) {
  const [selectedDecision, setSelectedDecision] = useState<'approved' | 'rejected' | 'needs_changes'>('approved');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onReview(submissionId, selectedDecision, notes);
      toast.success(`Submission ${selectedDecision} successfully`);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to review submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const decisionOptions = [
    {
      value: 'approved',
      label: 'Approve',
      icon: Check,
      color: 'green',
      description: 'Move submission to next stage'
    },
    {
      value: 'rejected',
      label: 'Reject',
      icon: XCircle,
      color: 'red',
      description: 'Reject this submission'
    },
    {
      value: 'needs_changes',
      label: 'Needs Changes',
      icon: AlertCircle,
      color: 'yellow',
      description: 'Request changes before approval'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Review Submission</h2>
            <p className="text-sm text-gray-600 mt-1">
              {candidateName} for {jobTitle}
            </p>
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
          {/* Decision Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Review Decision
            </label>
            <div className="space-y-2">
              {decisionOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedDecision === option.value
                        ? `border-${option.color}-500 bg-${option.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={option.value}
                      checked={selectedDecision === option.value}
                      onChange={(e) => setSelectedDecision(e.target.value as any)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                      selectedDecision === option.value
                        ? `border-${option.color}-500 bg-${option.color}-500`
                        : 'border-gray-300'
                    }`}>
                      {selectedDecision === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <Icon className={`w-5 h-5 text-${option.color}-500 mr-3`} />
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Review Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your review notes here..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Notes are optional but recommended for rejected submissions or when requesting changes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Decision: <span className="font-medium">{selectedDecision}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedDecision === 'approved' ? 'bg-green-600' :
                selectedDecision === 'rejected' ? 'bg-red-600' :
                'bg-yellow-600'
              }`}
            >
              {isSubmitting ? 'Submitting...' : `Submit ${selectedDecision}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}