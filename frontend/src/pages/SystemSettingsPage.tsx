import { useState, useEffect } from "react";
import { Sliders, Cpu, Save, Key, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

interface SettingsData {
  llm_provider: string;
  gemini_api_key?: string;
  openai_api_key?: string;
  matching_threshold: number;
  max_file_size_mb: number;
  auto_match: boolean;
  ocr_enabled: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"ai" | "matching" | "general">("ai");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    llm_provider: "gemini",
    gemini_api_key: "",
    openai_api_key: "",
    matching_threshold: 70,
    max_file_size_mb: 10,
    auto_match: true,
    ocr_enabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/settings");
      if (response.data?.settings) {
        setSettings({
          ...settings,
          ...response.data.settings,
        });
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error);
      toast.error(error.response?.data?.message || "Failed to load system settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put("/settings", { settings });
      toast.success("Settings updated successfully!");
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error(error.response?.data?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: keyof SettingsData, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">Configure AI parsing, matching engine, and general defaults</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "ai"
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Cpu className="h-4 w-4" />
            AI Parsing Engine
          </button>
          <button
            onClick={() => setActiveTab("matching")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "matching"
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Matching & Thresholds
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "general"
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Key className="h-4 w-4" />
            Limits & OCR
          </button>
        </div>

        {/* Tab Contents */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {activeTab === "ai" && (
            <div className="space-y-6">
              {/* LLM Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Active AI Provider
                </label>
                <select
                  value={settings.llm_provider}
                  onChange={(e) => handleChange("llm_provider", e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="openai">OpenAI GPT-4</option>
                  <option value="none">Deterministic (Rule-based Only)</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Select the underlying LLM provider used to parse unstructured resumes.
                </p>
              </div>

              {settings.llm_provider !== "none" && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4 max-w-2xl">
                  <h3 className="text-sm font-semibold text-slate-800">API Credentials</h3>
                  
                  {settings.llm_provider === "gemini" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        GEMINI_API_KEY
                      </label>
                      <input
                        type="password"
                        value={settings.gemini_api_key || ""}
                        onChange={(e) => handleChange("gemini_api_key", e.target.value)}
                        placeholder="Paste your Gemini key here"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-xs"
                      />
                    </div>
                  )}

                  {settings.llm_provider === "openai" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        OPENAI_API_KEY
                      </label>
                      <input
                        type="password"
                        value={settings.openai_api_key || ""}
                        onChange={(e) => handleChange("openai_api_key", e.target.value)}
                        placeholder="Paste your OpenAI API key here"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "matching" && (
            <div className="space-y-6">
              {/* Threshold */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Candidate Matching Threshold: {settings.matching_threshold}%
                </label>
                <div className="flex items-center gap-4 max-w-md">
                  <input
                    type="range"
                    min="30"
                    max="95"
                    value={settings.matching_threshold}
                    onChange={(e) => handleChange("matching_threshold", parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-indigo-600">{settings.matching_threshold}%</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Minimum overall compatibility score required to designate a candidate as a "Strong Match".
                </p>
              </div>

              {/* Auto Match */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="auto_match"
                  checked={settings.auto_match}
                  onChange={(e) => handleChange("auto_match", e.target.checked)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <div>
                  <label htmlFor="auto_match" className="block text-sm font-medium text-slate-700">
                    Auto-Run Candidate Matching
                  </label>
                  <p className="text-xs text-slate-500">
                    When a new resume parses successfully, trigger the matching algorithm for all active jobs automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Max upload size */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Maximum File Size (MB)
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={settings.max_file_size_mb}
                  onChange={(e) => handleChange("max_file_size_mb", parseInt(e.target.value))}
                  className="w-40 px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Limits the size of candidate resume uploads.
                </p>
              </div>

              {/* OCR Toggle */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="ocr_enabled"
                  checked={settings.ocr_enabled}
                  onChange={(e) => handleChange("ocr_enabled", e.target.checked)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <div>
                  <label htmlFor="ocr_enabled" className="block text-sm font-medium text-slate-700">
                    Enable OCR for Image PDF Resumes
                  </label>
                  <p className="text-xs text-slate-500">
                    Use Tesseract/OCR engine to read scanned or unselectable image-based resumes automatically.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex gap-3 max-w-2xl">
                <ShieldAlert className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  <span className="font-semibold block mb-0.5">Warning</span>
                  Enabling OCR parsing adds significant processing overhead and increases response timeouts for large documents.
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all text-sm"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving Config..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
