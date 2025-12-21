import { useState, useEffect } from "react";
import { Tag } from "@/types";
import { Plus, ArrowLeft, ArrowRight, Search, TagIcon, Merge, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TagsList from "./TagsList";
import TagForm from "./TagForm";
import TagBadge from "./TagBadge";
import TagMergeDialog from "./TagMergeDialog";
import { fuzzySearch } from "@/lib/levenshtein";
import { useAppLayout } from "@/hooks/useAppLayout";

interface SidebarProps {
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  onTagCreate: (tag: Omit<Tag, "id">) => void;
  onTagUpdate: (tag: Tag) => void;
  onTagDelete: (tagId: string) => void;
}

const Sidebar = ({ tags, selectedTags, onTagSelect, onTagCreate, onTagUpdate, onTagDelete }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);

  const { showUntagged, toggleUntagged, handleTagMerge } = useAppLayout();

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const filteredTags = fuzzySearch(
    tagSearchTerm,
    tags,
    (tag) => tag.name,
    0.3 // Lower threshold for more flexible matching
  );

  const selectedTagsData = tags.filter((tag) => selectedTags.includes(tag.id));

  return (
    <div className={`relative flex flex-col h-full border-r bg-gradient-to-b from-muted/30 to-muted/10 transition-all duration-300 ${collapsed ? "w-14 md:w-16" : "w-72 sm:w-80"}`}>
      {/* Selected Tags Section - Hidden when collapsed */}
      {!collapsed && selectedTagsData.length > 0 && (
        <div className="flex flex-col p-2 sm:p-3 border-b bg-primary/5 gap-1 animate-in slide-in-from-top duration-200">
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
      <div className="flex-1 overflow-auto p-2 sm:p-3 custom-scrollbar">
        {collapsed ? (
          // Collapsed View - Circular Tag Icons
          <div className="flex flex-col items-center space-y-2.5">
            <Button variant="ghost" size="icon" onClick={handleNewTag} title="Add new tag" className="h-8 w-8 rounded-full hover:bg-primary/10 transition-all">
              <Plus size={16} />
            </Button>
            {tags.slice(0, 14).map((tag) => (
              <div
                key={tag.id}
                onClick={() => onTagSelect(tag.id)}
                style={{ backgroundColor: tag.color }}
                className={`w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 hover:shadow-md ${selectedTags.includes(tag.id) ? "ring-2 ring-primary ring-offset-2 scale-105" : ""}`}
                title={tag.name}
              />
            ))}
          </div>
        ) : (
          // Expanded View
          <div className="space-y-3">
            {/* Search + Add Button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search tags..."
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {tagSearchTerm && (
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1 h-7 w-7 p-0" onClick={() => setTagSearchTerm("")}>
                    <X size={14} />
                  </Button>
                )}
              </div>
              <Button variant="default" size="icon" onClick={handleNewTag} title="Add new tag" className="h-9 w-9 shadow-sm hover:shadow transition-all">
                <Plus size={16} />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 items-center">
              {/* Untagged Links Button */}
              <Button variant={showUntagged ? "default" : "outline"} className="flex-1 justify-start gap-2 text-sm h-9 shadow-sm hover:shadow transition-all" onClick={toggleUntagged}>
                <TagIcon size={16} />
                <span className="truncate">Untagged</span>
              </Button>
              {/* Merge Tags Button */}
              <Button variant="outline" size="icon" onClick={() => setIsMergeDialogOpen(true)} title="Merge tags" className="h-9 w-9 shadow-sm hover:shadow transition-all" disabled={tags.length < 2}>
                <Merge size={16} />
              </Button>
            </div>

            {/* Tags List */}
            <div className="space-y-2">
              {tagSearchTerm && (
                <p className="text-xs text-muted-foreground px-1">
                  Found {filteredTags.length} tag{filteredTags.length !== 1 ? "s" : ""}
                </p>
              )}
              <TagsList tags={filteredTags} selectedTags={selectedTags} onTagSelect={onTagSelect} onTagEdit={handleEditTag} onTagDelete={onTagDelete} />
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center hover:bg-primary/10 transition-all"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </Button>
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
