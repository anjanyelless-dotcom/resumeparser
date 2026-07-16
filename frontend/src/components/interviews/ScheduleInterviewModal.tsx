import { useState } from "react";
import { X, Calendar, Video, Phone, Users } from "lucide-react";

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (roundName: string, scheduledAt: string, mode: string) => void;
  isScheduling: boolean;
}

export default function ScheduleInterviewModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  isScheduling 
}: ScheduleInterviewModalProps) {
  const [roundName, setRoundName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState("video");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roundName || !scheduledAt) {
      return;
    }

    onSchedule(roundName, scheduledAt, mode);
  };

  const resetForm = () => {
    setRoundName("");
    setScheduledAt("");
    setMode("video");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const getModeIcon = (modeValue: string) => {
    switch (modeValue) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
      case 'on-site':
        return <Users className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Schedule Interview</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Round Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interview Round
              </label>
              <input
                type="text"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g., Technical Round, HR Round"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Date and Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date and Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={`${minDate}T09:00`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Select a future date and time
              </p>
            </div>

            {/* Interview Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interview Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'video', label: 'Video Call' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'in-person', label: 'In-Person' },
                  { value: 'on-site', label: 'On-Site' }
                ].map((modeOption) => (
                  <label
                    key={modeOption.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      mode === modeOption.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={modeOption.value}
                      checked={mode === modeOption.value}
                      onChange={(e) => setMode(e.target.value)}
                      className="sr-only"
                    />
                    {getModeIcon(modeOption.value)}
                    <span className="text-sm font-medium">{modeOption.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isScheduling || !roundName || !scheduledAt}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}