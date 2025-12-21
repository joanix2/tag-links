import { useState, useRef, useEffect } from "react";
import { Tag } from "@/types";
import { X, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fuzzySearch } from "@/lib/levenshtein";

interface TagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  onCreateTag?: (tagName: string) => void;
  placeholder?: string;
  className?: string;
}

const TagSelector = ({ tags, selectedTagIds, onTagsChange, onCreateTag, placeholder = "Search tags...", className = "" }: TagSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter tags based on search term
  const filteredTags = searchTerm ? fuzzySearch(searchTerm, tags, (tag) => tag.name, 0.3) : tags;

  // Get unselected tags for dropdown
  const availableTags = filteredTags.filter((tag) => !selectedTagIds.includes(tag.id));

  // Get selected tags objects
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when filtered tags change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const handleSelectTag = (tagId: string) => {
    onTagsChange([...selectedTagIds, tagId]);
    setSearchTerm("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== "Escape") {
      setIsOpen(true);
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < availableTags.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (availableTags.length > 0 && highlightedIndex < availableTags.length) {
          handleSelectTag(availableTags[highlightedIndex].id);
        } else if (searchTerm.trim() && onCreateTag && availableTags.length === 0) {
          // Create new tag if no matches and onCreateTag is provided
          onCreateTag(searchTerm.trim());
          setSearchTerm("");
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        break;
      case "Backspace":
        if (searchTerm === "" && selectedTagIds.length > 0) {
          // Remove last selected tag when backspace on empty input
          handleRemoveTag(selectedTagIds[selectedTagIds.length - 1]);
        }
        break;
    }
  };

  const handleCreateTag = () => {
    if (searchTerm.trim() && onCreateTag) {
      onCreateTag(searchTerm.trim());
      setSearchTerm("");
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Tags (Chips) */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white pl-2 pr-1 py-1 flex items-center gap-1">
              <span>{tag.name}</span>
              <button type="button" onClick={() => handleRemoveTag(tag.id)} className="hover:bg-white/20 rounded-full p-0.5 transition-colors" aria-label={`Remove ${tag.name}`}>
                <X size={14} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (availableTags.length > 0 || (searchTerm && onCreateTag)) && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {availableTags.length > 0 ? (
            <div className="py-1">
              {availableTags.map((tag, index) => (
                <div
                  key={tag.id}
                  onClick={() => handleSelectTag(tag.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    px-3 py-2 cursor-pointer flex items-center gap-2
                    ${highlightedIndex === index ? "bg-accent" : ""}
                    hover:bg-accent transition-colors
                  `}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span>{tag.name}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Create new tag option */}
          {searchTerm && onCreateTag && availableTags.length === 0 && (
            <div onClick={handleCreateTag} className="px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-accent transition-colors border-t">
              <Plus size={16} className="text-muted-foreground" />
              <span className="text-sm">
                Create tag "<strong>{searchTerm}</strong>"
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
