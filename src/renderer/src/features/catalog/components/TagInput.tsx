import { useState, useRef, useCallback, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagItem {
  id: string;
  name: string;
  hexCode?: string;
}

interface TagInputProps {
  label: string;
  placeholder: string;
  tags: TagItem[];
  suggestions: TagItem[];
  onAdd: (tag: TagItem) => void;
  onRemove: (tagId: string) => void;
  showColorSwatch?: boolean;
}

export default function TagInput({
  label,
  placeholder,
  tags,
  suggestions,
  onAdd,
  onRemove,
  showColorSwatch = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.some((t) => t.id === s.id),
  );

  const handleAdd = useCallback(
    (tag: TagItem) => {
      onAdd(tag);
      setInputValue("");
      setShowDropdown(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [onAdd],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && filteredSuggestions[highlightIndex]) {
          handleAdd(filteredSuggestions[highlightIndex]);
        } else if (inputValue.trim()) {
          // Allow custom values
          const existing = suggestions.find(
            (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase(),
          );
          if (existing && !tags.some((t) => t.id === existing.id)) {
            handleAdd(existing);
          } else if (
            !tags.some(
              (t) => t.name.toLowerCase() === inputValue.trim().toLowerCase(),
            )
          ) {
            handleAdd({
              id: `custom-${Date.now()}`,
              name: inputValue.trim(),
              hexCode: undefined,
            });
          }
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
        );
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightIndex(-1);
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        onRemove(tags[tags.length - 1].id);
      }
    },
    [
      highlightIndex,
      filteredSuggestions,
      inputValue,
      suggestions,
      tags,
      handleAdd,
      onRemove,
    ],
  );

  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll("[data-suggestion]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[42px] bg-input border border-border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent text-sm rounded-md border border-accent/20"
            >
              {showColorSwatch && tag.hexCode && (
                <span
                  className="w-3 h-3 rounded-full border border-border/50 shrink-0"
                  style={{ backgroundColor: tag.hexCode }}
                />
              )}
              <span className="truncate max-w-[100px]">{tag.name}</span>
              <button
                type="button"
                onClick={() => onRemove(tag.id)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove ${tag.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="p-0.5 text-muted-foreground hover:text-accent transition-colors"
            aria-label="Add tag"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showDropdown && filteredSuggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-md shadow-lg"
          >
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={suggestion.id}
                data-suggestion
                type="button"
                onClick={() => handleAdd(suggestion)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                  idx === highlightIndex && "bg-muted",
                )}
              >
                {showColorSwatch && suggestion.hexCode && (
                  <span
                    className="w-4 h-4 rounded-full border border-border/50 shrink-0"
                    style={{ backgroundColor: suggestion.hexCode }}
                  />
                )}
                <span>{suggestion.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
