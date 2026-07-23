import { useState } from "react";
import { X, Plus } from "lucide-react";

import { Label } from "../../../components/ui/label";
import Input from "../../../components/common/Input";

interface SkillsInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function SkillsInput({ label, values, onChange, placeholder = "Add a skill" }: SkillsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAddSkill = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    onChange(values.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Skill tags */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700"
            >
              {skill}
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                className="ml-1 rounded-full hover:bg-brand-200"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Input field */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleAddSkill}
          disabled={!inputValue.trim() || values.includes(inputValue.trim())}
          className="rounded-lg bg-brand-500 px-3 py-2 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      <p className="text-xs text-slate-500">
        Press Enter or comma to add skills
      </p>
    </div>
  );
}
