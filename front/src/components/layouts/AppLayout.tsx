import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, LogOut, Link2, Network, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { Tag } from "@/types";
import { useApi } from "@/hooks/useApi";
import { AppLayoutContext, AppLayoutContextType } from "@/hooks/useAppLayout";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { fetchApi } = useApi();
  const location = useLocation();

  // State
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<"links" | "graph">("links");
  const [showUntagged, setShowUntagged] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if we're on the dashboard page
  const isDashboard = location.pathname === "/dashboard";

  // Load tags on mount
  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTags = async () => {
    try {
      const tagsData = await fetchApi("/tags/?limit=1000", { method: "GET" });
      setTags(
        tagsData.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color || "#4c1d95",
        }))
      );
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  };

  // Tag handlers
  const handleTagCreate = async (tagData: Omit<Tag, "id">): Promise<Tag> => {
    try {
      const newTag = await fetchApi("/tags/", {
        method: "POST",
        body: JSON.stringify(tagData),
      });

      const createdTag: Tag = { id: newTag.id, name: newTag.name, color: newTag.color || "#4c1d95" };
      setTags((prevTags) => [...prevTags, createdTag]);
      return createdTag;
    } catch (error) {
      console.error("Failed to create tag:", error);
      throw error;
    }
  };

  const handleTagUpdate = async (tag: Tag) => {
    try {
      await fetchApi(`/tags/${tag.id}`, {
        method: "PUT",
        body: JSON.stringify(tag),
      });

      setTags(tags.map((t) => (t.id === tag.id ? tag : t)));
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const handleTagDelete = async (tagId: string) => {
    try {
      await fetchApi(`/tags/${tagId}`, {
        method: "DELETE",
      });

      // Update state immediately after successful deletion
      setTags((prevTags) => prevTags.filter((t) => t.id !== tagId));
      setSelectedTags((prevSelected) => prevSelected.filter((id) => id !== tagId));
    } catch (error) {
      console.error("Failed to delete tag:", error);
      // Optionally reload tags if deletion failed
      loadTags();
    }
  };

  const handleTagSelect = (tagId: string) => {
    // Disable untagged filter when selecting a tag
    setShowUntagged(false);
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const toggleUntagged = () => {
    const newShowUntagged = !showUntagged;
    setShowUntagged(newShowUntagged);
    // Clear selected tags when showing untagged
    if (newShowUntagged) {
      setSelectedTags([]);
    }
  };

  const handleTagMerge = async (sourceTagIds: string[], targetTag: { name: string; color: string }) => {
    try {
      await fetchApi("/tags/merge", {
        method: "POST",
        body: JSON.stringify({
          source_tag_ids: sourceTagIds,
          target_tag_id: targetTag,
        }),
      });

      // Reload tags to reflect the changes
      await loadTags();

      // Clear selected tags if any of the merged tags were selected
      setSelectedTags((prev) => prev.filter((id) => !sourceTagIds.includes(id)));
    } catch (error) {
      console.error("Failed to merge tags:", error);
      throw error;
    }
  };

  // Get initials from username
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const showSidebar = tags.length > 0;

  const contextValue: AppLayoutContextType = {
    tags,
    selectedTags,
    currentView,
    showUntagged,
    setCurrentView,
    handleTagSelect,
    handleTagCreate,
    handleTagUpdate,
    handleTagDelete,
    handleTagMerge,
    toggleUntagged,
    reloadTags: loadTags,
  };

  return (
    <AppLayoutContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="border-b bg-white shadow-sm z-10">
              <div className="px-3 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  {/* Logo + Title */}
                  <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity group">
                    <img src="/taglink_logo.svg" alt="TagLink Logo" className="h-8 w-8 sm:h-10 sm:w-10 transition-transform group-hover:scale-105" />
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">TagLink</h1>
                  </Link>

                  {/* Desktop View Switcher */}
                  {isDashboard && (
                    <div className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                      <Button variant={currentView === "links" ? "default" : "ghost"} size="sm" onClick={() => setCurrentView("links")} className="gap-2 transition-all">
                        <Link2 size={16} />
                        Links
                      </Button>
                      <Button variant={currentView === "graph" ? "default" : "ghost"} size="sm" onClick={() => setCurrentView("graph")} className="gap-2 transition-all">
                        <Network size={16} />
                        Graph
                      </Button>
                    </div>
                  )}

                  {/* Right side: Mobile Tabs + User Menu */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Mobile/Tablet View Switcher */}
                    {isDashboard && (
                      <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as "links" | "graph")} className="lg:hidden">
                        <TabsList className="h-9">
                          <TabsTrigger value="links" className="gap-1 sm:gap-2 px-2 sm:px-3">
                            <Link2 size={16} />
                            <span className="hidden xs:inline">Links</span>
                          </TabsTrigger>
                          <TabsTrigger value="graph" className="gap-1 sm:gap-2 px-2 sm:px-3">
                            <Network size={16} />
                            <span className="hidden xs:inline">Graph</span>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}

                    {/* User Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all">
                          <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">{user?.username ? getInitials(user.username) : "U"}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end">
                        {user && (
                          <>
                            <div className="flex flex-col space-y-1 p-2">
                              <p className="text-sm font-medium">{user.username}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem asChild>
                          <Link to="/profile" className="cursor-pointer flex w-full items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    </AppLayoutContext.Provider>
  );
}
