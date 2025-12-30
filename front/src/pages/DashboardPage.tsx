import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Link, Tag } from "@/types";
import LinksView from "@/components/LinksView";
import GraphView from "@/components/graph";
import { CSVUpload, CSVLinkData, ImportError } from "@/components/CSVUpload";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLayout } from "@/hooks/useAppLayout";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { levenshteinSimilarity } from "@/lib/levenshtein";
import { toggleSpecialTag } from "@/services/tagService";

function DashboardContent() {
  const { fetchApi } = useApi();
  const { user } = useAuth();
  const { tags, selectedTags, currentView, showUntagged, tagMatchMode, reloadTags, tagsLoading, hasMoreTags, totalTags, tagsScrollContainerRef, registerTagsFromLinks } = useAppLayout();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "none">("none");
  const [searchResults, setSearchResults] = useState<Link[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Infinite scroll for links
  const fetchLinks = useCallback(
    async (skip: number, limit: number) => {
      // Build query params
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });

      // Add tag filtering if tags are selected
      if (selectedTags.length > 0) {
        params.append("tag_ids", selectedTags.join(","));
        params.append("match_mode", tagMatchMode); // Use the mode from context
      }

      // Add untagged filter
      if (showUntagged) {
        params.append("show_untagged", "true");
      }

      const response = await fetchApi(`/urls/?${params.toString()}`, { method: "GET" });
      return {
        items: response.items.map((l: { id: string; title: string; url: string; description?: string; tags: Tag[]; created_at: string }) => ({
          id: l.id,
          title: l.title,
          url: l.url,
          description: l.description,
          tags: l.tags ? l.tags.map((t: Tag) => t.id) : [],
          tagObjects: l.tags || [],
          createdAt: new Date(l.created_at),
        })),
        total: response.total,
        has_more: response.has_more,
      };
    },
    [fetchApi, selectedTags, showUntagged, tagMatchMode]
  );

  const {
    items: links,
    loading,
    hasMore,
    total: totalLinks,
    reload: reloadLinks,
    setItems: setLinks,
    scrollContainerRef,
  } = useInfiniteScroll<Link>({
    fetchData: fetchLinks,
    limit: 50,
    enabled: true,
    threshold: 500,
  });

  // Reload links when filters change (selectedTags, showUntagged, or tagMatchMode)
  useEffect(() => {
    reloadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags, showUntagged, tagMatchMode]); // Only trigger on filter changes, not on reloadLinks

  // Register all tags from links into the global tags map
  useEffect(() => {
    const allLinkTags: Tag[] = [];
    links.forEach((link) => {
      if (link.tagObjects) {
        allLinkTags.push(...link.tagObjects);
      }
    });
    if (allLinkTags.length > 0) {
      registerTagsFromLinks(allLinkTags);
    }
  }, [links, registerTagsFromLinks]);

  // Debounced search effect for links
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await fetchApi(`/urls/search/?q=${encodeURIComponent(searchTerm)}&threshold=0.3&limit=1000`, {
          method: "GET",
        });

        // Transform results to Link format
        const transformedResults = (results as Array<{ id: string; title: string; url: string; description?: string; tags: Tag[]; created_at: string }>).map((l) => ({
          id: l.id,
          title: l.title,
          url: l.url,
          description: l.description,
          tags: l.tags ? l.tags.map((t: Tag) => t.id) : [],
          tagObjects: l.tags || [],
          createdAt: new Date(l.created_at),
        }));

        setSearchResults(transformedResults);
      } catch (error) {
        console.error("Failed to search links:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Only depend on searchTerm

  // Link handlers
  const handleLinkSubmit = async (linkData: Omit<Link, "id" | "createdAt"> | Link) => {
    try {
      // Check if it's an edit (has id) or a new link
      const isEdit = "id" in linkData;

      if (isEdit) {
        // Update existing link
        const updatedLink = await fetchApi(`/urls/${linkData.id}`, {
          method: "PUT",
          body: JSON.stringify({
            url: linkData.url,
            title: linkData.title,
            description: linkData.description,
            tag_ids: linkData.tags,
          }),
        });

        // Update the link in the list using functional update
        setLinks((prevLinks) =>
          prevLinks.map((link) =>
            link.id === linkData.id
              ? {
                  id: updatedLink.id,
                  title: updatedLink.title,
                  url: updatedLink.url,
                  description: updatedLink.description,
                  tags: updatedLink.tags ? updatedLink.tags.map((t: Tag) => t.id) : [],
                  tagObjects: updatedLink.tags || [],
                  createdAt: new Date(updatedLink.created_at),
                }
              : link
          )
        );
      } else {
        // Create new link
        const newLink = await fetchApi("/urls/", {
          method: "POST",
          body: JSON.stringify({
            url: linkData.url,
            title: linkData.title,
            description: linkData.description,
            user_id: user?.id,
            tag_ids: linkData.tags,
          }),
        });

        // Add new link to the list using functional update
        setLinks((prevLinks) => [
          {
            id: newLink.id,
            title: newLink.title,
            url: newLink.url,
            description: newLink.description,
            tags: newLink.tags ? newLink.tags.map((t: Tag) => t.id) : [],
            tagObjects: newLink.tags || [],
            createdAt: new Date(newLink.created_at),
          },
          ...prevLinks,
        ]);
      }
    } catch (error) {
      console.error("Failed to save link:", error);
    }
  };

  const handleLinkEdit = () => {
    // Handled in LinksView
  };

  const handleLinkDelete = async (linkId: string) => {
    try {
      await fetchApi(`/urls/${linkId}`, {
        method: "DELETE",
      });

      // Update state immediately after successful deletion using functional update
      setLinks((prevLinks) => prevLinks.filter((link) => link.id !== linkId));
    } catch (error) {
      console.error("Failed to delete link:", error);
      // Optionally reload links if deletion failed
      reloadLinks();
    }
  };

  const handleBulkDelete = async (linkIds: string[]) => {
    try {
      const response = await fetchApi("/urls/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ url_ids: linkIds }),
      });

      // Update state to remove deleted links
      setLinks((prevLinks) => prevLinks.filter((link) => !linkIds.includes(link.id)));

      // Log errors if any
      if (response.errors && response.errors.length > 0) {
        console.error("Some deletions failed:", response.errors);
      }

      return response;
    } catch (error) {
      console.error("Failed to bulk delete links:", error);
      // Optionally reload links if deletion failed
      reloadLinks();
      throw error;
    }
  };

  const toggleFavorite = async (linkId: string) => {
    try {
      const link = links.find((l) => l.id === linkId);
      if (!link) return;

      const result = await toggleSpecialTag({
        linkId,
        link,
        tags,
        tagName: "Favoris",
        tagColor: "#EF4444", // Red
        fetchApi,
        userId: user?.id,
      });

      // Reload tags if a new tag was created
      if (result.needsTagReload) {
        await reloadTags();
      }

      // Update local state
      setLinks((prevLinks) => prevLinks.map((l) => (l.id === linkId ? { ...l, tags: result.updatedTags, tagObjects: result.updatedTagObjects } : l)));
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const toggleShare = async (linkId: string) => {
    try {
      const link = links.find((l) => l.id === linkId);
      if (!link) return;

      const result = await toggleSpecialTag({
        linkId,
        link,
        tags,
        tagName: "Partage",
        tagColor: "#92400E", // Brown (amber-800)
        fetchApi,
        userId: user?.id,
      });

      // Reload tags if a new tag was created
      if (result.needsTagReload) {
        await reloadTags();
      }

      // Update local state
      setLinks((prevLinks) => prevLinks.map((l) => (l.id === linkId ? { ...l, tags: result.updatedTags, tagObjects: result.updatedTagObjects } : l)));
    } catch (error) {
      console.error("Failed to toggle share:", error);
    }
  };

  const handleCSVUpload = async (data: CSVLinkData[]): Promise<{ success: number; errors: ImportError[] }> => {
    try {
      const response = await fetchApi("/urls/bulk-import", {
        method: "POST",
        body: JSON.stringify({ links: data }),
      });

      // Reload links and tags to get the newly imported ones
      await Promise.all([reloadLinks(), reloadTags()]);

      return {
        success: response.success || 0,
        errors: response.errors || [],
      };
    } catch (error) {
      console.error("Failed to import CSV:", error);
      throw error;
    }
  };

  // Filtered links
  const filteredLinks = useMemo(() => {
    // Use search results if searching, otherwise use loaded links
    // Note: Tag filtering and untagged filtering are now handled server-side via fetchLinks
    let filtered = searchTerm.trim() ? searchResults : links;

    // No need for local tag filtering - already done by the API
    // The links array already contains the filtered results from the server

    // Sort by date if requested
    if (sortOrder !== "none") {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
    }

    return filtered;
  }, [links, searchTerm, sortOrder, searchResults]);

  return currentView === "links" ? (
    <LinksView
      links={filteredLinks}
      tags={tags}
      selectedTags={selectedTags}
      searchTerm={searchTerm}
      onSearch={setSearchTerm}
      onLinkEdit={handleLinkEdit}
      onLinkDelete={handleLinkDelete}
      onBulkDelete={handleBulkDelete}
      onLinkSubmit={handleLinkSubmit}
      onToggleFavorite={toggleFavorite}
      onToggleShare={toggleShare}
      onCSVUpload={handleCSVUpload}
      sortOrder={sortOrder}
      onSortChange={setSortOrder}
      loading={loading || isSearching}
      totalLinks={totalLinks}
      scrollContainerRef={scrollContainerRef}
      tagsLoading={tagsLoading}
      tagsScrollContainerRef={tagsScrollContainerRef}
      totalTags={totalTags}
    />
  ) : (
    <div className="w-full h-full">
      <GraphView links={filteredLinks} tags={tags} selectedTags={selectedTags} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  );
}
