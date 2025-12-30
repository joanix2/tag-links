import { useState, useEffect } from "react";
import { Tag } from "@/types";
import { Plus, Search, TagIcon, Merge, X, Loader2, Heart, Share2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TagsList from "./TagsList";
import TagForm from "./TagForm";
import TagBadge from "./TagBadge";
import TagMergeDialog from "./TagMergeDialog";
import { useAppLayout } from "@/hooks/useAppLayout";
import { useApi } from "@/hooks/useApi";

interface SidebarProps {
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  onTagCreate: (tag: Omit<Tag, "id">) => void;
  onTagUpdate: (tag: Tag) => void;
  onTagDelete: (tagId: string) => void;
  tagsLoading?: boolean;
  tagsScrollContainerRef?: (node: HTMLDivElement | null) => void;
  totalTags?: number;
}

const Sidebar = ({ tags, selectedTags, onTagSelect, onTagCreate, onTagUpdate, onTagDelete, tagsLoading, tagsScrollContainerRef, totalTags }: SidebarProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Tag[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");

  const { showUntagged, toggleUntagged, handleTagMerge, selectedTagsData, tagMatchMode, setTagMatchMode } = useAppLayout();
  const { fetchApi } = useApi();

  // Document types list (matching backend DOCUMENT_TYPES)
  const DOCUMENT_TYPES = ["Page", "Image", "Vidéo", "Son", "Texte", "PDF", "Présentation", "3D", "Formulaire", "Carte", "Tableau", "Graphique", "Animation", "Jeu", "Quiz", "Simulation", "Autre"];

  // Find special tags by name
  const favoritesTag = tags.find((tag) => tag.name.toLowerCase() === "favoris");
  const sharedTag = tags.find((tag) => tag.name.toLowerCase() === "partage");

  // Find document type tags (tags matching DOCUMENT_TYPES list)
  const docTypeTags = tags.filter((tag) => DOCUMENT_TYPES.includes(tag.name));

  const handleToggleFavorites = () => {
    if (favoritesTag) {
      onTagSelect(favoritesTag.id);
      setShowFavorites(!showFavorites);
    }
  };

  const handleToggleShared = () => {
    if (sharedTag) {
      onTagSelect(sharedTag.id);
      setShowShared(!showShared);
    }
  };

  const handleDocTypeChange = (value: string) => {
    // Clear previous doc type selection if any
    const currentDocType = docTypeTags.find((tag) => selectedTags.includes(tag.id));
    if (currentDocType) {
      onTagSelect(currentDocType.id); // Deselect current
    }

    if (value && value !== "all") {
      setSelectedDocType(value);
      onTagSelect(value); // Select new doc type
    } else {
      setSelectedDocType("");
    }
  };

  const handleNewTag = () => {
    setEditingTag(null);
    setIsDialogOpen(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = (tagData: Omit<Tag, "id">) => {
    if (editingTag) {
      onTagUpdate({ ...tagData, id: editingTag.id });
    } else {
      onTagCreate(tagData);
    }
    setIsDialogOpen(false);
    setEditingTag(null);
  };

  const handleFormCancel = () => {
    setIsDialogOpen(false);
    setEditingTag(null);
  };

  const handleMergeSubmit = async (sourceTagIds: string[], targetTag: { name: string; color: string }) => {
    await handleTagMerge(sourceTagIds, targetTag);
    setIsMergeDialogOpen(false);
  };

  // Debounced search effect
  useEffect(() => {
    if (!tagSearchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await fetchApi(`/tags/search/?q=${encodeURIComponent(tagSearchTerm)}&threshold=0.3&limit=100&include_system=false`, {
          method: "GET",
        });
        setSearchResults(results as Tag[]);
      } catch (error) {
        console.error("Failed to search tags:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagSearchTerm]); // Only depend on tagSearchTerm, not fetchApi

  // Use search results if searching, otherwise use loaded tags
  // Filter out system tags from display (but keep them in the tags array for Favoris/Partage buttons)
  const filteredTags = (tagSearchTerm.trim() ? searchResults : tags).filter((tag) => !tag.is_system);

  return (
    <div className="relative flex flex-col h-full w-80 border-r bg-gradient-to-b from-muted/30 to-muted/10">
      {/* Selected Tags Section */}
      {selectedTagsData.length > 0 && (
        <div className="flex flex-col p-3 border-b bg-primary/5 gap-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <TagIcon size={12} />
              Selected ({selectedTagsData.length})
            </h3>
            {selectedTagsData.length > 0 && (
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => selectedTagsData.forEach((tag) => onTagSelect(tag.id))}>
                Clear all
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedTagsData.map((tag) => (
              <TagBadge key={tag.id} tag={tag} isSelected={true} size="sm" onClick={() => onTagSelect(tag.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div id="sidebar-main-content" className="flex-1 min-h-0 p-3 flex flex-col">
        {/* Document Type Selector */}
        {docTypeTags.length > 0 && (
          <div className="flex gap-2 items-center flex-shrink-0 mb-3">
            <Select value={selectedDocType || "all"} onValueChange={handleDocTypeChange}>
              <SelectTrigger className="h-9 text-sm shadow-sm hover:shadow transition-all">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-muted-foreground" />
                  <SelectValue placeholder="All document types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All document types</SelectItem>
                {docTypeTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex gap-2 flex-shrink-0 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tags..."
              value={tagSearchTerm}
              onChange={(e) => setTagSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {isSearching && <Loader2 className="absolute right-8 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />}
            {tagSearchTerm && !isSearching && (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1 h-7 w-7 p-0" onClick={() => setTagSearchTerm("")}>
                <X size={14} />
              </Button>
            )}
          </div>
          {/* Add Button */}
          <Button variant="default" size="icon" onClick={handleNewTag} title="Add new tag" className="h-9 w-9 shadow-sm hover:shadow transition-all">
            <Plus size={16} />
          </Button>
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-2 items-center flex-shrink-0 mb-3">
          {/* Untagged Links Button */}
          <Button variant={showUntagged ? "default" : "outline"} className="flex-1 justify-start gap-2 text-sm h-9 shadow-sm hover:shadow transition-all" onClick={toggleUntagged}>
            <TagIcon size={16} />
            <span className="truncate">Untagged</span>
          </Button>
          {/* Favorites Button */}
          <Button
            variant={favoritesTag && selectedTags.includes(favoritesTag.id) ? "default" : "outline"}
            size="icon"
            onClick={handleToggleFavorites}
            title="Show favorites"
            className="h-9 w-9 shadow-sm hover:shadow transition-all"
            disabled={!favoritesTag}
          >
            <Heart size={16} />
          </Button>
          {/* Shared Button */}
          <Button
            variant={sharedTag && selectedTags.includes(sharedTag.id) ? "default" : "outline"}
            size="icon"
            onClick={handleToggleShared}
            title="Show shared"
            className="h-9 w-9 shadow-sm hover:shadow transition-all"
            disabled={!sharedTag}
          >
            <Share2 size={16} />
          </Button>
          {/* Match Mode Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTagMatchMode(tagMatchMode === "OR" ? "AND" : "OR")}
            title={tagMatchMode === "OR" ? "Click to switch to AND mode (all tags)" : "Click to switch to OR mode (any tag)"}
            className="h-9 w-9 shadow-sm hover:shadow transition-all font-semibold"
          >
            {tagMatchMode}
          </Button>
          {/* Merge Tags Button */}
          <Button variant="outline" size="icon" onClick={() => setIsMergeDialogOpen(true)} title="Merge tags" className="h-9 w-9 shadow-sm hover:shadow transition-all" disabled={tags.length < 2}>
            <Merge size={16} />
          </Button>
        </div>

        {/* Tags Counter */}
        <p className="text-xs text-muted-foreground px-1 mb-2 flex-shrink-0">
          {tagSearchTerm ? `${filteredTags.length} result${filteredTags.length !== 1 ? "s" : ""}` : `${totalTags || tags.length} tag${(totalTags || tags.length) !== 1 ? "s" : ""}`}
        </p>

        {/* Tags List - This is the scrollable container */}
        <div
          id="tags-scroll-container"
          ref={tagSearchTerm ? undefined : tagsScrollContainerRef}
          className="flex-1 min-h-0 overflow-auto pb-4 scrollbar-hide bg-primary text-primary-foreground rounded-lg"
        >
          <TagsList tags={filteredTags} selectedTags={selectedTags} onTagSelect={onTagSelect} onTagEdit={handleEditTag} onTagDelete={onTagDelete} />

          {/* Loading indicator */}
          {tagsLoading && !tagSearchTerm && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Dialog for creating/editing tags */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
          </DialogHeader>
          <TagForm tag={editingTag} onSubmit={handleFormSubmit} onCancel={handleFormCancel} />
        </DialogContent>
      </Dialog>

      {/* Dialog for merging tags */}
      <TagMergeDialog isOpen={isMergeDialogOpen} tags={tags} onMerge={handleMergeSubmit} onCancel={() => setIsMergeDialogOpen(false)} />
    </div>
  );
};

export default Sidebar;
