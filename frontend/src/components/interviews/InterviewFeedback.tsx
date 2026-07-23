import { useState } from "react";
import { Star, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface InterviewFeedbackProps {
  existingFeedback?: {
    outcome: string;
    notes?: string;
    rating?: number;
  };
  onSubmit: (outcome: string, notes?: string, rating?: number) => void;
  isSubmitting: boolean;
}

export default function InterviewFeedback({ 
  existingFeedback, 
  onSubmit, 
  isSubmitting 
}: InterviewFeedbackProps) {
  const [outcome, setOutcome] = useState(existingFeedback?.outcome || "");
  const [notes, setNotes] = useState(existingFeedback?.notes || "");
  const [rating, setRating] = useState(existingFeedback?.rating || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!outcome) {
      return;
    }

    onSubmit(outcome, notes || undefined, rating || undefined);
  };

  const getOutcomeIcon = (outcomeValue: string) => {
    switch (outcomeValue) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'no_show':
        return <Clock className="h-5 w-5 text-gray-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getOutcomeColor = (outcomeValue: string) => {
    switch (outcomeValue) {
      case 'pass':
        return 'border-green-500 bg-green-50 text-green-700';
      case 'fail':
        return 'border-red-500 bg-red-50 text-red-700';
      case 'no_show':
        return 'border-gray-500 bg-gray-50 text-gray-700';
      case 'pending':
        return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      default:
        return 'border-gray-300 bg-white text-gray-700';
    }
  };

  if (existingFeedback) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Interview Feedback</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {getOutcomeIcon(existingFeedback.outcome)}
            <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border ${getOutcomeColor(existingFeedback.outcome)}`}>
              {existingFeedback.outcome.charAt(0).toUpperCase() + existingFeedback.outcome.slice(1)}
            </span>
          </div>
          
          {existingFeedback.rating && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">Rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= (existingFeedback.rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">({existingFeedback.rating}/5)</span>
            </div>
          )}
          
          {existingFeedback.notes && (
            <div>
              <span className="text-sm text-gray-600">Notes:</span>
              <p className="text-sm text-gray-800 mt-1">{existingFeedback.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Add Interview Feedback</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Outcome
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'pass', label: 'Pass', icon: <CheckCircle className="h-4 w-4" /> },
              { value: 'fail', label: 'Fail', icon: <XCircle className="h-4 w-4" /> },
              { value: 'no_show', label: 'No Show', icon: <Clock className="h-4 w-4" /> },
              { value: 'pending', label: 'Pending', icon: <AlertCircle className="h-4 w-4" /> }
            ].map((outcomeOption) => (
              <label
                key={outcomeOption.value}
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                  outcome === outcomeOption.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="outcome"
                  value={outcomeOption.value}
                  checked={outcome === outcomeOption.value}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="sr-only"
                />
                {outcomeOption.icon}
                <span className="text-sm font-medium">{outcomeOption.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating (Optional)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300 hover:text-yellow-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <span className="text-sm text-gray-600">({rating}/5)</span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add interview notes, observations, or feedback..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !outcome}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}