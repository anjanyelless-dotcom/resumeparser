import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, Save, Eye, Plus, Trash2 } from "lucide-react";

interface EmailTemplate {
  subject: string;
  body: string;
}

interface EmailTemplates {
  [templateName: string]: EmailTemplate;
}

const DEFAULT_TEMPLATES = {
  "Interview Invitation": {
    subject: "Interview Invitation - {{candidate_name}} for {{job_title}}",
    body: "Dear {{candidate_name}},\n\nWe're pleased to invite you for an interview for the {{job_title}} position at {{company_name}}.\n\nInterview Details:\nDate: {{interview_date}}\nTime: {{interview_time}}\nLocation: {{interview_location}}\n\nPlease confirm your attendance.\n\nBest regards,\n{{recruiter_name}}"
  },
  "Offer Letter": {
    subject: "Job Offer - {{job_title}} at {{company_name}}",
    body: "Dear {{candidate_name}},\n\nWe're delighted to offer you the position of {{job_title}} at {{company_name}}.\n\nOffer Details:\nPosition: {{job_title}}\nSalary: {{salary}}\nStart Date: {{start_date}}\nLocation: {{location}}\n\nPlease review and sign the offer letter.\n\nCongratulations!\n{{recruiter_name}}"
  },
  "Rejection Notice": {
    subject: "Update on your application for {{job_title}}",
    body: "Dear {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}.\n\nAfter careful consideration, we've decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your time and wish you success in your job search.\n\nBest regards,\n{{recruiter_name}}"
  },
  "Submission Acknowledgement": {
    subject: "Application Received - {{job_title}}",
    body: "Dear {{candidate_name}},\n\nThank you for submitting your application for the {{job_title}} position at {{company_name}}.\n\nWe've received your application and our team will review it carefully. We'll contact you within {{response_time}} if your profile matches our requirements.\n\nApplication Details:\nPosition: {{job_title}}\nSubmitted: {{submission_date}}\nApplication ID: {{application_id}}\n\nBest regards,\n{{company_name}} Team"
  }
};

export default function EmailTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings");
      const emailTemplates = response.data.settings.email_templates || {};
      setTemplates(emailTemplates);
      if (Object.keys(emailTemplates).length > 0) {
        setSelectedTemplate(Object.keys(emailTemplates)[0]);
      }
    } catch (error) {
      toast.error("Failed to load email templates");
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
          email_templates: templates,
        },
      });
      
      toast.success("Email templates saved successfully");
    } catch (error) {
      toast.error("Failed to save email templates");
    } finally {
      setIsSaving(false);
    }
  };

  const updateTemplate = (templateName: string, field: keyof EmailTemplate, value: string) => {
    setTemplates(prev => ({
      ...prev,
      [templateName]: {
        ...prev[templateName],
        [field]: value,
      },
    }));
  };

  const addNewTemplate = () => {
    const name = prompt("Enter template name:");
    if (!name) return;
    
    if (templates[name]) {
      toast.error("Template with this name already exists");
      return;
    }
    
    setTemplates(prev => ({
      ...prev,
      [name]: {
        subject: `{{subject}} for {{job_title}}`,
        body: "Dear {{candidate_name}},\n\n{{message}}\n\nBest regards,\n{{company_name}} Team"
      },
    }));
    setSelectedTemplate(name);
  };

  const deleteTemplate = (templateName: string) => {
    if (!confirm(`Are you sure you want to delete the "${templateName}" template?`)) return;
    
    setTemplates(prev => {
      const newTemplates = { ...prev };
      delete newTemplates[templateName];
      return newTemplates;
    });
    
    if (selectedTemplate === templateName) {
      const remainingTemplates = Object.keys(templates).filter(name => name !== templateName);
      setSelectedTemplate(remainingTemplates[0] || "");
    }
  };

  const getAvailableVariables = () => {
    return [
      "{{candidate_name}}", "{{job_title}}", "{{company_name}}", "{{recruiter_name}}",
      "{{interview_date}}", "{{interview_time}}", "{{interview_location}}",
      "{{salary}}", "{{start_date}}", "{{location}}", "{{response_time}}",
      "{{submission_date}}", "{{application_id}}"
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentTemplate = templates[selectedTemplate];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
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
              <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
              <p className="text-gray-600 mt-1">Configure email templates for automated communications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              {previewMode ? "Edit Mode" : "Preview Mode"}
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Templates"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Templates</h2>
                  <button
                    onClick={addNewTemplate}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {Object.keys(templates).map(templateName => (
                  <div
                    key={templateName}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedTemplate === templateName ? "bg-indigo-50 border-indigo-200" : ""
                    }`}
                    onClick={() => setSelectedTemplate(templateName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{templateName}</span>
                      </div>
                      {!DEFAULT_TEMPLATES[templateName as keyof typeof DEFAULT_TEMPLATES] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(templateName);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-3">
            {currentTemplate ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">{selectedTemplate}</h2>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Line
                    </label>
                    {previewMode ? (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        {currentTemplate.subject}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={currentTemplate.subject}
                        onChange={(e) => updateTemplate(selectedTemplate, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Email subject line"
                      />
                    )}
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Body
                    </label>
                    {previewMode ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg whitespace-pre-wrap">
                        {currentTemplate.body}
                      </div>
                    ) : (
                      <textarea
                        value={currentTemplate.body}
                        onChange={(e) => updateTemplate(selectedTemplate, 'body', e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        placeholder="Email body content"
                      />
                    )}
                  </div>

                  {/* Available Variables */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Available Variables</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {getAvailableVariables().map(variable => (
                        <code key={variable} className="text-blue-800 bg-blue-100 px-2 py-1 rounded">
                          {variable}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
                <p className="text-gray-600 mb-4">Select a template from the list to edit or create a new one.</p>
                <button
                  onClick={addNewTemplate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create New Template
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}