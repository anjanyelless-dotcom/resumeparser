import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface PipelineStage {
  name: string;
  order: number;
  isActive: boolean;
}

export default function PipelineStagesPage() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings");
      setStages(response.data.settings.pipeline_stages || []);
    } catch (error) {
      toast.error("Failed to load pipeline stages");
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
          pipeline_stages: stages,
        },
      });
      
      toast.success("Pipeline stages saved successfully");
    } catch (error) {
      toast.error("Failed to save pipeline stages");
    } finally {
      setIsSaving(false);
    }
  };

  const addStage = () => {
    const newStage: PipelineStage = {
      name: "New Stage",
      order: stages.length + 1,
      isActive: true,
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    const updatedStages = stages.filter((_, i) => i !== index);
    // Reorder remaining stages
    const reorderedStages = updatedStages.map((stage, i) => ({
      ...stage,
      order: i + 1,
    }));
    setStages(reorderedStages);
  };

  const updateStage = (index: number, field: keyof PipelineStage, value: any) => {
    const updatedStages = [...stages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setStages(updatedStages);
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stages.length - 1)
    ) {
      return;
    }

    const updatedStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap stages
    [updatedStages[index], updatedStages[targetIndex]] = [updatedStages[targetIndex], updatedStages[index]];
    
    // Update order values
    updatedStages.forEach((stage, i) => {
      stage.order = i + 1;
    });
    
    setStages(updatedStages);
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
              <h1 className="text-2xl font-bold text-gray-900">Pipeline Stages</h1>
              <p className="text-gray-600 mt-1">Configure the stages of your recruitment pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Stages List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Pipeline Stages</h2>
              <button
                onClick={addStage}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50"
              >
                <Plus className="w-4 h-4" />
                Add Stage
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {stages.map((stage, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveStage(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-600"></div>
                    </button>
                    <button
                      onClick={() => moveStage(index, 'down')}
                      disabled={index === stages.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600"></div>
                    </button>
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => updateStage(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Stage name"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Order: {stage.order}</span>
                      </div>

                      <button
                        onClick={() => updateStage(index, 'isActive', !stage.isActive)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                      >
                        {stage.isActive ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-sm ${stage.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {stage.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </button>

                      <button
                        onClick={() => removeStage(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {stages.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-500">No pipeline stages configured yet.</p>
              <button
                onClick={addStage}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Your First Stage
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Pipeline Stages Guide</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Drag stages up or down to reorder them</li>
            <li>• Click the toggle to enable/disable stages</li>
            <li>• Inactive stages won't appear in the candidate pipeline</li>
            <li>• Changes are saved when you click "Save Changes"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}