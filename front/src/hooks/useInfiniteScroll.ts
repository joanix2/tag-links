import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchData: (
    skip: number,
    limit: number
  ) => Promise<{
    items: T[];
    total: number;
    has_more: boolean;
  }>;
  limit?: number;
  enabled?: boolean;
  threshold?: number;
  maxItems?: number; // Maximum items to keep in memory (for performance)
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  total: number;
  reload: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  scrollContainerRef: (node: HTMLDivElement | null) => void;
}

/**
 * Hook for infinite scroll functionality
 * Uses a callback ref for stable DOM element reference
 */
export function useInfiniteScroll<T>({ fetchData, limit = 50, enabled = true, threshold = 200, maxItems = 5000 }: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  // State
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Refs for DOM and mutable values
  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef(0);
  const initialLoadDone = useRef(false);

  // Refs to track latest state values without causing re-renders
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const enabledRef = useRef(enabled);
  const thresholdRef = useRef(threshold);

  // Sync refs with state
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  /**
   * Load more items from the data source
   */
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !enabledRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await fetchData(skipRef.current, limit);

      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => (item as { id: string }).id));
        const newItems = response.items.filter((item) => !existingIds.has((item as { id: string }).id));
        const combined = [...prev, ...newItems];

        // Limit total items in memory for performance
        // Keep the most recent items if we exceed maxItems
        if (combined.length > maxItems) {
          console.warn(`[useInfiniteScroll] Reached max items limit (${maxItems}). Some older items will be removed.`);
          return combined.slice(-maxItems);
        }

        return combined;
      });

      setHasMore(response.has_more);
      setTotal(response.total);
      skipRef.current += limit;
    } catch (error) {
      console.error("[useInfiniteScroll] Failed to load more items:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchData, limit, maxItems]);

  // Keep loadMore ref updated
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  /**
   * Reset all state to initial values
   */
  const reload = useCallback(() => {
    setItems([]);
    setTotal(0);
    setHasMore(true);
    skipRef.current = 0;
    initialLoadDone.current = false;
  }, []);

  /**
   * Stable scroll handler (never changes identity)
   * Reads current state from refs to avoid stale closures
   */
  const handleScroll = useCallback(() => {
    const el = containerNodeRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;

    // Skip if container hasn't been laid out yet
    if (clientHeight === 0) return;

    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceToBottom < thresholdRef.current) {
      loadMoreRef.current();
    }
  }, []);

  /**
   * Callback ref - called by React when the DOM element is mounted/unmounted
   * This is more reliable than useRef for tracking DOM elements
   */
  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerNodeRef.current = node;
  }, []);

  /**
   * Attach/detach scroll listener
   * Uses AbortController for clean automatic cleanup
   */
  useEffect(() => {
    const el = containerNodeRef.current;
    if (!el || !enabled) return;

    const controller = new AbortController();
    el.addEventListener("scroll", handleScroll, { signal: controller.signal });

    return () => controller.abort();
  }, [enabled, handleScroll]);

  /**
   * Initial data load
   */
  useEffect(() => {
    if (enabled && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadMore();
    }
  }, [enabled, loadMore]);

  return {
    items,
    loading,
    hasMore,
    total,
    reload,
    setItems,
    scrollContainerRef,
  };
}
