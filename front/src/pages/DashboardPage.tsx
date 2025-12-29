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
  const { tags, selectedTags, currentView, showUntagged, reloadTags, tagsLoading } = useAppLayout();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "none">("none");

  // Infinite scroll for links
  const fetchLinks = useCallback(
    async (skip: number, limit: number) => {
      const response = await fetchApi(`/urls/?skip=${skip}&limit=${limit}`, { method: "GET" });
      return {
        items: response.items.map((l: { id: string; title: string; url: string; description?: string; tags: Tag[]; created_at: string }) => ({
          id: l.id,
          title: l.title,
          url: l.url,
          description: l.description,
          tags: l.tags ? l.tags.map((t: Tag) => t.id) : [],
          createdAt: new Date(l.created_at),
        })),
        total: response.total,
        has_more: response.has_more,
      };
    },
    [fetchApi]
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
      setLinks((prevLinks) => prevLinks.map((l) => (l.id === linkId ? { ...l, tags: result.updatedTags } : l)));
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
      setLinks((prevLinks) => prevLinks.map((l) => (l.id === linkId ? { ...l, tags: result.updatedTags } : l)));
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
    let filtered = links;

    // Filter by untagged if requested
    if (showUntagged) {
      filtered = filtered.filter((link) => link.tags.length === 0);
    } else {
      // Filter by selected tags (OR logic with sorting by match count)
      if (selectedTags.length > 0) {
        // Filter links that have at least one of the selected tags
        filtered = filtered.filter((link) => selectedTags.some((tagId) => link.tags.includes(tagId)));

        // Sort by number of matching tags (descending)
        filtered = filtered.sort((a, b) => {
          const aMatches = selectedTags.filter((tagId) => a.tags.includes(tagId)).length;
          const bMatches = selectedTags.filter((tagId) => b.tags.includes(tagId)).length;
          return bMatches - aMatches;
        });
      }
    }

    // Filter by search term using Levenshtein distance
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const threshold = 0.3; // Minimum similarity threshold

      filtered = filtered
        .map((link) => {
          // Check exact match first (highest priority)
          const titleLower = link.title.toLowerCase();
          const descLower = link.description?.toLowerCase() || "";
          const urlLower = link.url.toLowerCase();

          if (titleLower.includes(term) || descLower.includes(term) || urlLower.includes(term)) {
            return { link, similarity: 1.0 }; // Exact match gets max score
          }

          // Calculate Levenshtein similarity for fuzzy matching
          const titleSimilarity = levenshteinSimilarity(term, titleLower);
          const descSimilarity = levenshteinSimilarity(term, descLower);
          const urlSimilarity = levenshteinSimilarity(term, urlLower);

          // Use the best similarity score
          const bestSimilarity = Math.max(titleSimilarity, descSimilarity, urlSimilarity);

          return { link, similarity: bestSimilarity };
        })
        .filter(({ similarity }) => similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .map(({ link }) => link);
    }

    // Sort by date if requested
    if (sortOrder !== "none") {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
    }

    return filtered;
  }, [links, selectedTags, searchTerm, sortOrder, showUntagged]);

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
      loading={loading}
      totalLinks={totalLinks}
      scrollContainerRef={scrollContainerRef}
      tagsLoading={tagsLoading}
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
