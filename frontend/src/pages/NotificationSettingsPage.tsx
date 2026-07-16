import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  Bell, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Users,
  Settings
} from "lucide-react";
import EditableField from "../components/candidate-detail/EditableField";

interface NotificationSetting {
  eventName: string;
  isEnabled: boolean;
  notifyRoles: string[];
}

interface Settings {
  notification_settings?: NotificationSetting[];
}

const AVAILABLE_ROLES = ["admin", "manager", "recruiter", "candidate", "team_lead", "hr", "bdm", "client_manager", "client"];

const EVENT_NAMES = [
  "candidate_submitted",
  "candidate_shortlisted", 
  "interview_scheduled",
  "interview_completed",
  "offer_extended",
  "offer_accepted",
  "candidate_rejected",
  "candidate_on_hold",
  "client_added",
  "job_created",
  "placement_created",
];

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/settings", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || {});
      } else {
        toast.error("Failed to fetch settings");
      }
    } catch (error) {
      toast.error("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toast.success("Notification settings saved successfully");
        setHasChanges(false);
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (index: number, field: keyof NotificationSetting, value: any) => {
    const newSettings = [...(settings.notification_settings || [])];
    newSettings[index] = { ...newSettings[index], [field]: value };
    setSettings({ ...settings, notification_settings: newSettings });
    setHasChanges(true);
  };

  const addSetting = () => {
    const existingEvents = (settings.notification_settings || []).map(s => s.eventName);
    const availableEvents = EVENT_NAMES.filter(event => !existingEvents.includes(event));
    
    if (availableEvents.length === 0) {
      toast.error("All available events are already configured");
      return;
    }

    const newSettings = [...(settings.notification_settings || [])];
    newSettings.push({
      eventName: availableEvents[0],
      isEnabled: true,
      notifyRoles: ["admin", "manager", "recruiter"],
    });
    setSettings({ ...settings, notification_settings: newSettings });
    setHasChanges(true);
  };

  const removeSetting = (index: number) => {
    const newSettings = [...(settings.notification_settings || [])];
    newSettings.splice(index, 1);
    setSettings({ ...settings, notification_settings: newSettings });
    setHasChanges(true);
  };

  const toggleRole = (settingIndex: number, role: string) => {
    const newSettings = [...(settings.notification_settings || [])];
    const currentRoles = newSettings[settingIndex].notifyRoles;
    
    if (currentRoles.includes(role)) {
      newSettings[settingIndex].notifyRoles = currentRoles.filter(r => r !== role);
    } else {
      newSettings[settingIndex].notifyRoles = [...currentRoles, role];
    }
    
    setSettings({ ...settings, notification_settings: newSettings });
    setHasChanges(true);
  };

  const resetSettings = () => {
    const defaultSettings: NotificationSetting[] = [
      {
        eventName: "candidate_submitted",
        isEnabled: true,
        notifyRoles: ["admin", "manager", "recruiter"]
      },
      {
        eventName: "candidate_shortlisted",
        isEnabled: true,
        notifyRoles: ["admin", "manager", "recruiter"]
      },
      {
        eventName: "interview_scheduled",
        isEnabled: true,
        notifyRoles: ["admin", "manager", "recruiter", "candidate"]
      },
      {
        eventName: "offer_extended",
        isEnabled: true,
        notifyRoles: ["admin", "manager", "recruiter"]
      },
      {
        eventName: "candidate_rejected",
        isEnabled: true,
        notifyRoles: ["admin", "manager", "recruiter"]
      }
    ];
    
    setSettings({ ...settings, notification_settings: defaultSettings });
    setHasChanges(true);
  };

  const getEventDisplayName = (eventName: string) => {
    return eventName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "Administrator",
      manager: "Manager", 
      recruiter: "Recruiter",
      candidate: "Candidate",
      team_lead: "Team Lead",
      hr: "HR",
      bdm: "Business Development",
      client_manager: "Client Manager",
      client: "Client"
    };
    return roleMap[role] || role;
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notification Settings</h1>
              <p className="text-gray-500 mt-1">Configure system notifications and alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetSettings}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Default
            </button>
            <button
              onClick={saveSettings}
              disabled={!hasChanges || isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Events</h2>
              <button
                onClick={addSetting}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading notification settings...</p>
              </div>
            ) : !settings.notification_settings || settings.notification_settings.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notification events configured</h3>
                <p className="text-gray-500 mb-4">Add your first notification event to get started</p>
                <button
                  onClick={addSetting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Event
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {settings.notification_settings.map((setting, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {getEventDisplayName(setting.eventName)}
                          </h3>
                          <span className="text-sm text-gray-500">
                            ({setting.eventName})
                          </span>
                        </div>
                        
                        {/* Event Name Editor */}
                        <div className="mb-4">
                          <EditableField
                            label="Event Name"
                            value={setting.eventName}
                            onSave={(value: string) => updateSetting(index, "eventName", value)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateSetting(index, "isEnabled", !setting.isEnabled)}
                          className={`p-2 rounded-md ${
                            setting.isEnabled
                              ? "text-green-600 hover:bg-green-50"
                              : "text-gray-400 hover:bg-gray-50"
                          }`}
                          title={setting.isEnabled ? "Notifications enabled" : "Notifications disabled"}
                        >
                          {setting.isEnabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        
                        <button
                          onClick={() => removeSetting(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          title="Remove notification setting"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notify Roles */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-gray-500" />
                        <label className="text-sm font-medium text-gray-700">Notify Roles:</label>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {AVAILABLE_ROLES.map((role) => (
                          <button
                            key={role}
                            onClick={() => toggleRole(index, role)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              setting.notifyRoles.includes(role)
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                            } border`}
                          >
                            {getRoleDisplayName(role)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Bell className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Notification Settings Configuration</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Configure which system events trigger notifications</li>
                  <li>Select which user roles should receive notifications for each event</li>
                  <li>Toggle individual events on/off without deleting them</li>
                  <li>Changes are saved when you click "Save Changes"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Available Events Reference */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Settings className="h-5 w-5 text-gray-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-800">Available System Events</h3>
              <div className="mt-2 text-sm text-gray-600">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {EVENT_NAMES.map((event) => (
                    <div key={event} className="text-xs">
                      <code className="bg-white px-1 py-0.5 rounded">{event}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}