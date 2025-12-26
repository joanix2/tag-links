import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link, Tag } from "@/types";
import SearchBar from "@/components/SearchBar";
import LinksList from "@/components/LinksList";
import LinkForm from "@/components/LinkForm";
import Sidebar from "@/components/Sidebar";
import { CSVUpload, CSVLinkData } from "@/components/CSVUpload";
import { useAppLayout } from "@/hooks/useAppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LinksViewProps {
  links: Link[];
  tags: Tag[];
  selectedTags: string[];
  searchTerm: string;
  onSearch: (term: string) => void;
  onLinkEdit: (link: Link) => void;
  onLinkDelete: (linkId: string) => void;
  onLinkSubmit: (link: Omit<Link, "id" | "createdAt"> | Link) => void;
  onToggleFavorite: (linkId: string) => void;
  onToggleShare: (linkId: string) => void;
  onCSVUpload?: (data: CSVLinkData[]) => Promise<void>;
  sortOrder: "newest" | "oldest" | "none";
  onSortChange: (order: "newest" | "oldest" | "none") => void;
}

const LinksView = ({
  links,
  tags,
  selectedTags,
  searchTerm,
  onSearch,
  onLinkEdit,
  onLinkDelete,
  onLinkSubmit,
  onToggleFavorite,
  onToggleShare,
  onCSVUpload,
  sortOrder,
  onSortChange,
}: LinksViewProps) => {
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);

  // Use context for tag management
  const { handleTagCreate, handleTagUpdate, handleTagDelete, handleTagSelect } = useAppLayout();

  const handleNewLink = () => {
    setEditingLink(null);
    setIsLinkFormOpen(true);
  };

  const handleEdit = (link: Link) => {
    setEditingLink(link);
    setIsLinkFormOpen(true);
    onLinkEdit(link);
  };

  const handleSubmit = (linkData: Omit<Link, "id" | "createdAt">) => {
    // If editing, pass the id along with the data
    if (editingLink) {
      onLinkSubmit({ ...linkData, id: editingLink.id, createdAt: editingLink.createdAt });
    } else {
      onLinkSubmit(linkData);
    }
    setIsLinkFormOpen(false);
    setEditingLink(null);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gradient-to-br from-background to-muted/20">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar tags={tags} selectedTags={selectedTags} onTagSelect={handleTagSelect} onTagCreate={handleTagCreate} onTagUpdate={handleTagUpdate} onTagDelete={handleTagDelete} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 border-b bg-card/50 backdrop-blur-sm">
          {/* Mobile Drawer */}
          <div className="md:hidden">
            <Sidebar tags={tags} selectedTags={selectedTags} onTagSelect={handleTagSelect} onTagCreate={handleTagCreate} onTagUpdate={handleTagUpdate} onTagDelete={handleTagDelete} />
          </div>

          {/* Search Bar */}
          <div className="flex-1">
            <SearchBar searchTerm={searchTerm} onSearch={onSearch} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end items-center">
            {onCSVUpload && <CSVUpload onUpload={onCSVUpload} />}
            <Button onClick={handleNewLink} className="shadow-sm hover:shadow transition-all">
              <Plus size={18} className="mr-2" />
              <span className="hidden xs:inline">Add Link</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 custom-scrollbar">
          {/* Stats and Sort Row */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm sm:text-base text-muted-foreground">
              <span className="font-semibold text-foreground">{links.length}</span> {links.length === 1 ? "link" : "links"}
              {selectedTags.length > 0 && (
                <>
                  {" "}
                  with <span className="font-semibold text-foreground">{selectedTags.length}</span> selected tag
                  {selectedTags.length > 1 ? "s" : ""}
                </>
              )}
              {searchTerm && (
                <>
                  {" "}
                  matching <span className="font-semibold text-foreground">"{searchTerm}"</span>
                </>
              )}
            </div>
            <Select value={sortOrder} onValueChange={onSortChange}>
              <SelectTrigger className="w-full sm:w-[180px] shadow-sm">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No sorting</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Links Grid */}
          <LinksList links={links} tags={tags} onLinkEdit={handleEdit} onLinkDelete={onLinkDelete} onToggleFavorite={onToggleFavorite} onToggleShare={onToggleShare} />
        </div>

        {/* Link Form Dialog */}
        <LinkForm
          isOpen={isLinkFormOpen}
          link={editingLink}
          tags={tags}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsLinkFormOpen(false);
            setEditingLink(null);
          }}
        />
      </div>
    </div>
  );
};

export default LinksView;
