import { useState } from "react";
import LabelingPage from "./LabelingPage";
import PermissionManagementPage from "./PermissionManagementPage";
import PipelineStagesPage from "./PipelineStagesPage";
import EmailTemplatesPage from "./EmailTemplatesPage";
import NotificationSettingsPage from "./NotificationSettingsPage";
import SystemSettingsPage from "./SystemSettingsPage";
import UsersPage from "./UsersPage";
import AuditLogPage from "./AuditLogPage";
import DuplicateReviewPage from "./DuplicateReviewPage";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "labeling" | "permissions" | "pipeline-stages" | "email-templates" | "notifications" | "users" | "audit-logs" | "duplicates">("general");

  return (
    <div className="p-6 min-h-full bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Configure system settings, permissions, and notifications.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("general")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "general"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("labeling")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "labeling"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Labeling
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "permissions"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Permissions
            </button>
            <button
              onClick={() => setActiveTab("pipeline-stages")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "pipeline-stages"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pipeline Stages
            </button>
            <button
              onClick={() => setActiveTab("email-templates")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "email-templates"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Email Templates
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "notifications"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "users"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("audit-logs")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "audit-logs"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab("duplicates")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "duplicates"
                  ? "border-[#f18622] text-[#f18622]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Duplicates
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "general" && (
          <div role="tabpanel">
            <SystemSettingsPage />
          </div>
        )}

        {activeTab === "labeling" && (
          <div role="tabpanel">
            <LabelingPage />
          </div>
        )}

        {activeTab === "permissions" && (
          <div role="tabpanel">
            <PermissionManagementPage />
          </div>
        )}

        {activeTab === "pipeline-stages" && (
          <div role="tabpanel">
            <PipelineStagesPage />
          </div>
        )}

        {activeTab === "email-templates" && (
          <div role="tabpanel">
            <EmailTemplatesPage />
          </div>
        )}

        {activeTab === "notifications" && (
          <div role="tabpanel">
            <NotificationSettingsPage />
          </div>
        )}

        {activeTab === "users" && (
          <div role="tabpanel">
            <UsersPage />
          </div>
        )}

        {activeTab === "audit-logs" && (
          <div role="tabpanel">
            <AuditLogPage />
          </div>
        )}

        {activeTab === "duplicates" && (
          <div role="tabpanel">
            <DuplicateReviewPage />
          </div>
        )}
      </div>
    </div>
  );
}