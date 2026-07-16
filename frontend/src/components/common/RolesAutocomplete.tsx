import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Briefcase } from 'lucide-react';
import { api } from '../../services/api';

interface Role {
  title: string;
  canonicalTitle: string;
  seniority: string;
  domain: string;
}

interface RolesAutocompleteProps {
  selectedRole?: string;
  onRoleChange: (role: string | undefined) => void;
  placeholder?: string;
  maxSuggestions?: number;
  allowCustom?: boolean;
  disabled?: boolean;
}

export default function RolesAutocomplete({
  selectedRole,
  onRoleChange,
  placeholder = 'Search or select role...',
  maxSuggestions = 10,
  allowCustom = true,
  disabled = false
}: RolesAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Role[]>([]);
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

  // Search roles with debounce
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
        const response = await api.get('/roles/search', {
          params: { q: query }
        });

        if (response.data.success) {
          setSuggestions(response.data.roles.slice(0, maxSuggestions));

          // Show custom option if no exact match found and custom roles are allowed
          const exactMatch = response.data.roles.some(
            (role: Role) => role.title.toLowerCase() === query.toLowerCase()
          );
          setShowCustomOption(allowCustom && !exactMatch && query.length >= 2);
        }
      } catch (error) {
        console.error('Error searching roles:', error);
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

  const handleSelectRole = useCallback((roleTitle: string) => {
    onRoleChange(roleTitle);
    setQuery('');
    setSuggestions([]);
    setShowCustomOption(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsEditing(false);
  }, [onRoleChange]);

  const handleAddCustomRole = useCallback(() => {
    if (query.trim()) {
      onRoleChange(query.trim());
    }
    setQuery('');
    setSuggestions([]);
    setShowCustomOption(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsEditing(false);
  }, [query, onRoleChange]);

  const handleClearRole = useCallback(() => {
    onRoleChange(undefined);
    setQuery('');
    setSuggestions([]);
    setShowCustomOption(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsEditing(false);
  }, [onRoleChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        // Select highlighted suggestion
        handleSelectRole(suggestions[highlightedIndex].title);
      } else if (highlightedIndex === suggestions.length && showCustomOption) {
        // Select highlighted custom option
        handleAddCustomRole();
      } else if (query.trim() && allowCustom) {
        // Fallback: use typed value as custom role if nothing is highlighted
        handleAddCustomRole();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      setShowCustomOption(false);
      setHighlightedIndex(-1);
      setIsEditing(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = showCustomOption ? suggestions.length : suggestions.length - 1;
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

  // Highlight matching text in suggestions
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
  }, []);

  return (
    <div className="w-full">
      {/* Input Field */}
      <div className="relative">
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={isEditing ? query : selectedRole || ''}
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
                  setIsOpen(false);
                  setIsEditing(false);
                  setQuery('');
                  setShowCustomOption(false);
                  setHighlightedIndex(-1);
                }
              }, 200);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {selectedRole && !isEditing && (
            <button
              onClick={handleClearRole}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isLoading && !selectedRole && (
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
                {suggestions.map((role, index) => (
                  <button
                    key={role.title}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectRole(role.title);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between group ${highlightedIndex === index
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                    type="button"
                  >
                    <span dangerouslySetInnerHTML={{ __html: highlightMatch(role.title, query) }} />
                    <span className={`text-xs ${highlightedIndex === index ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`}>
                      {role.domain}
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
                    handleAddCustomRole();
                  }}
                  onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${highlightedIndex === suggestions.length
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                  type="button"
                >
                  <Search className="w-4 h-4" />
                  Add "{query}" as custom role
                </button>
              </>
            )}

            {suggestions.length === 0 && !showCustomOption && query.length >= 2 && !isLoading && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No roles found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="mt-1.5 text-xs text-gray-500">
        Type 2+ characters to search roles. Press Enter to select.
      </p>
    </div>
  );
}
