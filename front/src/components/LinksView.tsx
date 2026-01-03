import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckSquare, Square, Loader2, Download } from "lucide-react";
import { Link, Tag } from "@/types";
import SearchBar from "@/components/SearchBar";
import LinksList from "@/components/LinksList";
import LinkForm from "@/components/LinkForm";
import Sidebar from "@/components/Sidebar";
import { CSVUpload, CSVLinkData, ImportError } from "@/components/CSVUpload";
import { useAppLayout } from "@/hooks/useAppLayout";
import { useApi } from "@/hooks/useApi";
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
  onCSVUpload?: (data: CSVLinkData[]) => Promise<{ success: number; errors: ImportError[] }>;
  sortOrder: "newest" | "oldest" | "none";
  onSortChange: (order: "newest" | "oldest" | "none") => void;
  loading?: boolean;
  totalLinks?: number;
  scrollContainerRef: (node: HTMLDivElement | null) => void;
  tagsLoading?: boolean;
  tagsScrollContainerRef?: (node: HTMLDivElement | null) => void;
  totalTags?: number;
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
  loading = false,
  totalLinks,
  scrollContainerRef,
  tagsLoading,
  tagsScrollContainerRef,
  totalTags,
}: LinksViewProps) => {
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [selectAllMode, setSelectAllMode] = useState(false); // true = all matching IDs selected
  const [isExporting, setIsExporting] = useState(false);

  // Use context for tag management
  const { handleTagCreate, handleTagUpdate, handleTagDelete, handleTagSelect, reloadTags, showUntagged, tagMatchMode } = useAppLayout();
  const { fetchApi } = useApi();

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
    // If we're in select all mode and user deselects, exit that mode
    if (selectAllMode) {
      setSelectAllMode(false);
    }
  };

  const handleToggleSelectAll = async () => {
    if (selectAllMode || selectedLinks.length > 0) {
      // Deselect all
      setSelectedLinks([]);
      setSelectAllMode(false);
    } else {
      // Select all matching the current filters
      setIsSelectingAll(true);
      try {
        const params = new URLSearchParams();

        if (selectedTags.length > 0) {
          params.append("tag_ids", selectedTags.join(","));
          params.append("match_mode", tagMatchMode);
        }

        if (showUntagged) {
          params.append("show_untagged", "true");
        }

        if (searchTerm) {
          params.append("search_term", searchTerm);
        }

        const response = await fetchApi(`/urls/ids?${params.toString()}`, {
          method: "GET",
        });

        const { ids } = response as { ids: string[]; total: number };
        setSelectedLinks(ids);
        setSelectAllMode(true);
      } catch (error) {
        console.error("Failed to fetch all link IDs:", error);
        // Fallback to selecting only visible links
        setSelectedLinks(links.map((link) => link.id));
        setSelectAllMode(false);
      } finally {
        setIsSelectingAll(false);
      }
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      await onBulkDelete(selectedLinks);
      setSelectedLinks([]);
      setSelectAllMode(false);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      // Keep the dialog open and selection in case of error
    }
  };

  const handleExportCSV = async () => {
    if (selectedLinks.length === 0) return;

    setIsExporting(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      // Call backend to generate CSV
      const response = await fetch(`${API_URL}/urls/export/csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedLinks),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `links_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const allSelected = selectAllMode || (links.length > 0 && selectedLinks.length === links.length);
  const hasMoreLinks = totalLinks && totalLinks > links.length;

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gradient-to-br from-background to-muted/20">
      {/* Sidebar */}
      <div className="h-full">
        <Sidebar
          tags={tags}
          selectedTags={selectedTags}
          onTagSelect={handleTagSelect}
          onTagCreate={handleTagCreate}
          onTagUpdate={handleTagUpdate}
          onTagDelete={handleTagDelete}
          tagsLoading={tagsLoading}
          tagsScrollContainerRef={tagsScrollContainerRef}
          totalTags={totalTags}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-6 border-b bg-card/50 backdrop-blur-sm">
          {/* Search Bar */}
          <div className="flex-1">
            <SearchBar searchTerm={searchTerm} onSearch={onSearch} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end items-center">
            {selectedLinks.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting} className="shadow-sm">
                  {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                  <span className="hidden sm:inline">Export ({selectedLinks.length})</span>
                  <span className="sm:hidden">Export</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="shadow-sm">
                  <Trash2 size={16} className="mr-2" />
                  <span className="hidden sm:inline">Delete ({selectedLinks.length})</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </>
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
        <div className="flex flex-col py-4">
          {/* Stats and Sort Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
            <div className="text-sm sm:text-base text-muted-foreground">
              {selectedLinks.length > 0 ? (
                <>
                  <span className="font-semibold text-foreground">{selectedLinks.length}</span> selected
                  {" / "}
                </>
              ) : null}
              <span className="font-semibold text-foreground">{totalLinks || links.length}</span> {(totalLinks || links.length) === 1 ? "link" : "links"}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSelectAll}
                  className="shadow-sm flex-1 sm:flex-initial"
                  disabled={isSelectingAll}
                  title={selectAllMode ? `All ${selectedLinks.length} matching links selected` : hasMoreLinks ? `Select all ${totalLinks} matching links` : undefined}
                >
                  {isSelectingAll ? <Loader2 size={16} className="mr-2 animate-spin" /> : allSelected ? <CheckSquare size={16} className="mr-2" /> : <Square size={16} className="mr-2" />}
                  <span>
                    {isSelectingAll ? "Loading..." : allSelected ? "Deselect All" : selectAllMode ? `All (${selectedLinks.length})` : hasMoreLinks ? `Select All (${totalLinks})` : "Select All"}
                  </span>
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
          <div ref={scrollContainerRef} className="overflow-y-auto scrollbar-hide" style={{ height: "calc(100vh - 200px)" }}>
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

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
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
                {selectAllMode && (
                  <>
                    <br />
                    <br />
                    <span className="text-primary font-medium">All matching links are selected ({selectedLinks.length} total).</span>
                  </>
                )}
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
