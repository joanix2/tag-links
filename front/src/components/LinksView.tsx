import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { Link, Tag } from "@/types";
import SearchBar from "@/components/SearchBar";
import LinksList from "@/components/LinksList";
import LinkForm from "@/components/LinkForm";
import Sidebar from "@/components/Sidebar";
import { CSVUpload, CSVLinkData } from "@/components/CSVUpload";
import { useAppLayout } from "@/hooks/useAppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface LinksViewProps {
  links: Link[];
  tags: Tag[];
  selectedTags: string[];
  searchTerm: string;
  onSearch: (term: string) => void;
  onLinkEdit: (link: Link) => void;
  onLinkDelete: (linkId: string) => void;
  onBulkDelete: (linkIds: string[]) => Promise<{ deleted: number; errors: unknown[] }>;
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
  onBulkDelete,
  onLinkSubmit,
  onToggleFavorite,
  onToggleShare,
  onCSVUpload,
  sortOrder,
  onSortChange,
}: LinksViewProps) => {
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use context for tag management
  const { handleTagCreate, handleTagUpdate, handleTagDelete, handleTagSelect, reloadTags } = useAppLayout();

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

  const handleToggleSelection = (linkId: string) => {
    setSelectedLinks((prev) => (prev.includes(linkId) ? prev.filter((id) => id !== linkId) : [...prev, linkId]));
  };

  const handleToggleSelectAll = () => {
    if (selectedLinks.length === links.length) {
      setSelectedLinks([]);
    } else {
      setSelectedLinks(links.map((link) => link.id));
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      await onBulkDelete(selectedLinks);
      setSelectedLinks([]);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      // Keep the dialog open and selection in case of error
    }
  };

  const allSelected = links.length > 0 && selectedLinks.length === links.length;

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
            {selectedLinks.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="shadow-sm">
                <Trash2 size={16} className="mr-2" />
                <span className="hidden sm:inline">Delete ({selectedLinks.length})</span>
                <span className="sm:hidden">Delete</span>
              </Button>
            )}
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
              {selectedLinks.length > 0 ? (
                <>
                  <span className="font-semibold text-foreground">{selectedLinks.length}</span> selected
                  {" / "}
                </>
              ) : null}
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
            <div className="flex gap-2 items-center w-full sm:w-auto">
              {links.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleToggleSelectAll} className="shadow-sm flex-1 sm:flex-initial">
                  {allSelected ? <CheckSquare size={16} className="mr-2" /> : <Square size={16} className="mr-2" />}
                  <span>{allSelected ? "Deselect All" : "Select All"}</span>
                </Button>
              )}
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
          </div>

          {/* Links Grid */}
          <LinksList
            links={links}
            tags={tags}
            onLinkEdit={handleEdit}
            onLinkDelete={onLinkDelete}
            onToggleFavorite={onToggleFavorite}
            onToggleShare={onToggleShare}
            selectedLinks={selectedLinks}
            onToggleSelection={handleToggleSelection}
          />
        </div>

        {/* Link Form Dialog */}
        <LinkForm
          isOpen={isLinkFormOpen}
          link={editingLink}
          tags={tags}
          onSubmit={handleSubmit}
          onTagCreate={handleTagCreate}
          reloadTags={reloadTags}
          onCancel={() => {
            setIsLinkFormOpen(false);
            setEditingLink(null);
          }}
        />

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedLinks.length} links?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedLinks.length} selected {selectedLinks.length === 1 ? "link" : "links"}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default LinksView;
