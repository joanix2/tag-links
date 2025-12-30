import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { AppLayoutContext, AppLayoutContextType } from "@/hooks/useAppLayout";
import { API_URL } from "@/config/env";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut, refreshUser } = useAuth();
  const { fetchApi } = useApi();
  const location = useLocation();

  // State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<"links" | "graph">("links");
  const [showUntagged, setShowUntagged] = useState(false);
  const [tagMatchMode, setTagMatchMode] = useState<"OR" | "AND">("OR");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [allTagsMap, setAllTagsMap] = useState<Map<string, Tag>>(new Map());

  // Initialize tagMatchMode from user preferences
  useEffect(() => {
    if (user?.tag_match_mode) {
      setTagMatchMode(user.tag_match_mode as "OR" | "AND");
    } else {
      // Default to OR if user preference is not set
      setTagMatchMode("OR");
    }
  }, [user?.tag_match_mode]); // Only depend on tag_match_mode, not entire user object

  // Check if we're on the dashboard page
  const isDashboard = location.pathname === "/dashboard";

  // Fetch function for tags (memoized like links)
  const fetchTags = useCallback(
    async (skip: number, limit: number) => {
      const response = await fetchApi(`/tags/?skip=${skip}&limit=${limit}&include_system=true`, { method: "GET" });
      return {
        items: response.items.map((t: { id: string; name: string; color?: string; is_system?: boolean }) => ({
          id: t.id,
          name: t.name,
          color: t.color || "#4c1d95",
          is_system: t.is_system || false,
        })),
        total: response.total,
        has_more: response.has_more,
      };
    },
    [fetchApi]
  );

  // Infinite scroll for tags
  const {
    items: tags,
    loading: tagsLoading,
    hasMore: hasMoreTags,
    total: totalTags,
    reload: reloadTags,
    setItems: setTags,
    scrollContainerRef: tagsScrollContainerRef,
  } = useInfiniteScroll<Tag>({
    fetchData: fetchTags,
    limit: 50,
    enabled: true,
    threshold: 200,
  });

  // Update allTagsMap whenever tags change
  useEffect(() => {
    setAllTagsMap((prevMap) => {
      const newMap = new Map(prevMap);
      tags.forEach((tag) => {
        newMap.set(tag.id, tag);
      });
      return newMap;
    });
  }, [tags]);

  // Function to register tags from links
  const registerTagsFromLinks = useCallback((linkTags: Tag[]) => {
    setAllTagsMap((prevMap) => {
      const newMap = new Map(prevMap);
      linkTags.forEach((tag) => {
        if (!newMap.has(tag.id)) {
          newMap.set(tag.id, tag);
        }
      });
      return newMap;
    });
  }, []);

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
      reloadTags();
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

  const handleSetTagMatchMode = async (mode: "OR" | "AND") => {
    setTagMatchMode(mode);

    // Save preference to backend
    try {
      await fetchApi(`/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify({ tag_match_mode: mode }),
      });

      // Refresh user data to sync the preference
      await refreshUser();
    } catch (error) {
      console.error("Failed to save tag match mode preference:", error);
    }
  };

  const handleTagMerge = async (sourceTagIds: string[], targetTag: { name: string; color: string }) => {
    try {
      const response = await fetchApi("/tags/merge", {
        method: "POST",
        body: JSON.stringify({
          source_tag_ids: sourceTagIds,
          target_tag_id: targetTag,
        }),
      });

      const mergedTagId = response.target_tag_id;

      // Reload tags to reflect the changes
      await reloadTags();

      // Update selected tags:
      // - Remove all source tags that were merged
      // - Add the new merged tag if any of the source tags were selected
      setSelectedTags((prev) => {
        const hadSelectedSourceTag = prev.some((id) => sourceTagIds.includes(id));
        const newSelection = prev.filter((id) => !sourceTagIds.includes(id));

        // If at least one merged tag was selected, add the new merged tag
        if (hadSelectedSourceTag && !newSelection.includes(mergedTagId)) {
          newSelection.push(mergedTagId);
        }

        return newSelection;
      });
    } catch (error) {
      console.error("Failed to merge tags:", error);
      throw error;
    }
  };

  // Get initials from username
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  // Get profile picture URL
  const getProfilePictureUrl = () => {
    if (user?.profile_picture) {
      // API_URL already contains /api, so we need to remove it and add /assets
      const baseUrl = API_URL.replace(/\/api$/, "");
      // Add timestamp to prevent browser caching
      return `${baseUrl}/assets/${user.profile_picture}?t=${Date.now()}`;
    }
    return undefined;
  };

  const showSidebar = tags.length > 0;

  // Get selected tags data from the allTagsMap
  const selectedTagsData = selectedTags.map((id) => allTagsMap.get(id)).filter((tag): tag is Tag => tag !== undefined);

  const contextValue: AppLayoutContextType = {
    tags,
    tagsLoading,
    hasMoreTags,
    totalTags,
    tagsScrollContainerRef,
    selectedTags,
    selectedTagsData,
    currentView,
    showUntagged,
    tagMatchMode,
    setCurrentView,
    setTagMatchMode: handleSetTagMatchMode,
    handleTagSelect,
    handleTagCreate,
    handleTagUpdate,
    handleTagDelete,
    handleTagMerge,
    toggleUntagged,
    reloadTags,
    registerTagsFromLinks,
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
                            <AvatarImage src={getProfilePictureUrl()} alt={user?.username} />
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
