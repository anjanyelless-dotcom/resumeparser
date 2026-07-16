import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Search } from 'lucide-react';
import axios from 'axios';

interface Skill {
  name: string;
  category: string;
}

interface SkillsAutocompleteProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
  maxSuggestions?: number;
  allowCustom?: boolean;
  disabled?: boolean;
}

export default function SkillsAutocomplete({
  selectedSkills,
  onSkillsChange,
  placeholder = 'Search skills...',
  maxSuggestions = 10,
  allowCustom = true,
  disabled = false
}: SkillsAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Skill[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomOption, setShowCustomOption] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery('');
        setShowCustomOption(false);
        setHighlightedIndex(-1);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search skills with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      setShowCustomOption(false);
      return;
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL;
        const apiUrl = baseUrl?.endsWith('/api') ? `${baseUrl}/skills/search` : `${baseUrl}/api/skills/search`;
        const response = await axios.get(apiUrl, {
          params: { q: query }
        });

        if (response.data.success) {
          setSuggestions(response.data.skills.slice(0, maxSuggestions));
          
          // Show custom option if no exact match found and custom skills are allowed
          const exactMatch = response.data.skills.some(
            (skill: Skill) => skill.name.toLowerCase() === query.toLowerCase()
          );
          setShowCustomOption(allowCustom && !exactMatch && query.length >= 2);
        }
      } catch (error) {
        console.error('Error searching skills:', error);
        setSuggestions([]);
        setShowCustomOption(allowCustom && query.length >= 2);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, maxSuggestions, allowCustom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsEditing(true);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelectSkill = useCallback((skillName: string) => {
    if (!selectedSkills.includes(skillName)) {
      onSkillsChange([...selectedSkills, skillName]);
    }
    setQuery('');
    setSuggestions([]);
    setShowCustomOption(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsEditing(false);
    inputRef.current?.focus();
  }, [selectedSkills, onSkillsChange]);

  const handleAddCustomSkill = useCallback(() => {
    if (query.trim() && !selectedSkills.includes(query.trim())) {
      onSkillsChange([...selectedSkills, query.trim()]);
    }
    setQuery('');
    setSuggestions([]);
    setShowCustomOption(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsEditing(false);
    inputRef.current?.focus();
  }, [query, selectedSkills, onSkillsChange]);

  const handleRemoveSkill = useCallback((skillToRemove: string) => {
    onSkillsChange(selectedSkills.filter(skill => skill !== skillToRemove));
  }, [selectedSkills, onSkillsChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const filteredSuggestions = suggestions.filter(skill => !selectedSkills.includes(skill.name));
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        // Select highlighted suggestion
        handleSelectSkill(filteredSuggestions[highlightedIndex].name);
      } else if (highlightedIndex === filteredSuggestions.length && showCustomOption) {
        // Select highlighted custom option
        handleAddCustomSkill();
      } else if (query.trim() && allowCustom) {
        // Fallback: use typed value as custom skill
        handleAddCustomSkill();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      setShowCustomOption(false);
      setHighlightedIndex(-1);
      setIsEditing(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const filteredSuggestions = suggestions.filter(skill => !selectedSkills.includes(skill.name));
      const maxIndex = showCustomOption ? filteredSuggestions.length : filteredSuggestions.length - 1;
      setHighlightedIndex(prev => 
        prev < maxIndex ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : -1
      );
    }
  };

  return (
    <div className="w-full">
      {/* Selected Skills Chips */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedSkills.map((skill) => (
            <div
              key={skill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium border border-indigo-200"
            >
              {skill}
              {!disabled && (
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={isEditing ? query : ''}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsOpen(true);
              setIsEditing(true);
            }}
            onBlur={() => {
              // Small delay to allow click events to fire
              setTimeout(() => {
                if (!isOpen) {
                  setIsEditing(false);
                  setQuery('');
                }
              }, 200);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {isOpen && (suggestions.length > 0 || showCustomOption) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                  Suggestions
                </div>
                {suggestions
                  .filter((skill) => !selectedSkills.includes(skill.name))
                  .map((skill, index) => (
                    <button
                      key={skill.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSkill(skill.name);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between group ${
                        highlightedIndex === index
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                      type="button"
                    >
                      <span>{skill.name}</span>
                      <span className={`text-xs ${highlightedIndex === index ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`}>
                        {skill.category}
                      </span>
                    </button>
                  ))}
              </>
            )}

            {showCustomOption && (
              <>
                {suggestions.length > 0 && (
                  <div className="border-t border-gray-200 my-1"></div>
                )}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddCustomSkill();
                  }}
                  onMouseEnter={() => setHighlightedIndex(suggestions.filter(skill => !selectedSkills.includes(skill.name)).length)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                    highlightedIndex === suggestions.filter(skill => !selectedSkills.includes(skill.name)).length
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Add "{query}" as custom skill
                </button>
              </>
            )}

            {suggestions.filter((skill) => !selectedSkills.includes(skill.name)).length === 0 && !showCustomOption && query.length >= 2 && !isLoading && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No skills found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="mt-1.5 text-xs text-gray-500">
        Type 2+ characters to search skills. Press Enter to add.
      </p>
    </div>
  );
}
