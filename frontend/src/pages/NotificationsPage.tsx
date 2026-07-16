import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Bell, Users, Settings, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface NotificationSetting {
  eventName: string;
  isEnabled: boolean;
  notifyRoles: string[];
}

const AVAILABLE_ROLES = ["admin", "manager", "recruiter", "candidate"];
const EVENT_DESCRIPTIONS = {
  "candidate_submitted": "When a new candidate submits an application",
  "candidate_shortlisted": "When a candidate is shortlisted for a position",
  "interview_scheduled": "When an interview is scheduled with a candidate",
  "offer_extended": "When a job offer is extended to a candidate",
  "candidate_rejected": "When a candidate is rejected from the process",
  "candidate_hired": "When a candidate accepts an offer and is hired",
  "interview_completed": "When an interview is completed",
  "offer_accepted": "When a candidate accepts a job offer",
  "offer_declined": "When a candidate declines a job offer"
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings");
      setNotifications(response.data.settings.notification_settings || []);
    } catch (error) {
      toast.error("Failed to load notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await api.get("/settings");
      const currentSettings = response.data.settings;
      
      await api.put("/settings", {
        settings: {
          ...currentSettings,
          notification_settings: notifications,
        },
      });
      
      toast.success("Notification settings saved successfully");
    } catch (error) {
      toast.error("Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotification = (index: number, field: keyof NotificationSetting, value: any) => {
    const updatedNotifications = [...notifications];
    updatedNotifications[index] = { ...updatedNotifications[index], [field]: value };
    setNotifications(updatedNotifications);
  };

  const toggleRole = (index: number, role: string) => {
    const currentRoles = notifications[index].notifyRoles;
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    updateNotification(index, 'notifyRoles', newRoles);
  };

  const addNotification = () => {
    const eventName = prompt("Enter event name (e.g., candidate_submitted):");
    if (!eventName) return;
    
    if (notifications.some(n => n.eventName === eventName)) {
      toast.error("Notification for this event already exists");
      return;
    }
    
    const newNotification: NotificationSetting = {
      eventName,
      isEnabled: true,
      notifyRoles: ["admin", "recruiter"],
    };
    setNotifications([...notifications, newNotification]);
  };

  const removeNotification = (index: number) => {
    const updatedNotifications = notifications.filter((_, i) => i !== index);
    setNotifications(updatedNotifications);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/settings")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
              <p className="text-gray-600 mt-1">Configure which events trigger notifications and who receives them</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addNotification}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Settings className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Event Notifications</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {notifications.map((notification, index) => (
              <div key={index} className="p-6">
                <div className="space-y-4">
                  {/* Event Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium text-gray-900">{notification.eventName}</h3>
                        {EVENT_DESCRIPTIONS[notification.eventName as keyof typeof EVENT_DESCRIPTIONS] && (
                          <p className="text-sm text-gray-600">
                            {EVENT_DESCRIPTIONS[notification.eventName as keyof typeof EVENT_DESCRIPTIONS]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateNotification(index, 'isEnabled', !notification.isEnabled)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                      >
                        {notification.isEnabled ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-sm ${notification.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {notification.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>
                      <button
                        onClick={() => removeNotification(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className={`${!notification.isEnabled ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Notify Roles:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ROLES.map(role => (
                        <button
                          key={role}
                          onClick={() => toggleRole(index, role)}
                          disabled={!notification.isEnabled}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            notification.notifyRoles.includes(role)
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          } ${!notification.isEnabled ? 'cursor-not-allowed' : ''}`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notification events configured</h3>
              <p className="text-gray-600 mb-4">Add events to configure when notifications should be sent.</p>
              <button
                onClick={addNotification}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Your First Event
              </button>
            </div>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Role Descriptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
            <div><strong>Admin:</strong> System administrators with full access</div>
            <div><strong>Manager:</strong> Hiring managers and team leads</div>
            <div><strong>Recruiter:</strong> Recruitment team members</div>
            <div><strong>Candidate:</strong> Job applicants and candidates</div>
          </div>
        </div>

        {/* Common Events */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Common Event Names</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
            {Object.entries(EVENT_DESCRIPTIONS).map(([event, description]) => (
              <div key={event} className="flex items-start gap-2">
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">{event}</code>
                <span className="text-gray-600">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}