import { useState, useEffect, useCallback, useRef } from "react";
import { FixedSizeList as List } from "react-window";

interface UseVirtualInfiniteScrollOptions<T> {
  fetchData: (skip: number, limit: number) => Promise<{
    items: T[];
    total: number;
    has_more: boolean;
  }>;
  limit?: number;
  enabled?: boolean;
  itemHeight?: number; // Average height for items
}

interface UseVirtualInfiniteScrollResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  total: number;
  reload: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  listRef: React.RefObject<List>;
  onItemsRendered: (props: { visibleStopIndex: number }) => void;
  getItemSize: (index: number) => number;
}

/**
 * Hook for virtual infinite scroll functionality
 * Uses react-window for virtualization and loads more items when approaching the end
 */
export function useVirtualInfiniteScroll<T>({
  fetchData,
  limit = 50,
  enabled = true,
  itemHeight = 100,
}: UseVirtualInfiniteScrollOptions<T>): UseVirtualInfiniteScrollResult<T> {
  // State
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Refs
  const listRef = useRef<List>(null);
  const skipRef = useRef(0);
  const initialLoadDone = useRef(false);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const enabledRef = useRef(enabled);

  // Sync refs with state
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

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
        return [...prev, ...newItems];
      });

      setHasMore(response.has_more);
      setTotal(response.total);
      skipRef.current += limit;
    } catch (error) {
      console.error("[useVirtualInfiniteScroll] Failed to load more items:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchData, limit]);

  /**
   * Reset all state to initial values
   */
  const reload = useCallback(() => {
    setItems([]);
    setTotal(0);
    setHasMore(true);
    skipRef.current = 0;
    initialLoadDone.current = false;
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, []);

  /**
   * Handle when items are rendered in the virtual list
   * Load more when approaching the end
   */
  const onItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      const threshold = 10; // Load more when within 10 items of the end
      if (
        hasMoreRef.current &&
        !loadingRef.current &&
        enabledRef.current &&
        items.length > 0 &&
        visibleStopIndex >= items.length - threshold
      ) {
        loadMore();
      }
    },
    [items.length, loadMore]
  );

  /**
   * Get the size of an item (can be customized per item)
   */
  const getItemSize = useCallback(
    (index: number) => {
      // You can customize this based on item content
      return itemHeight;
    },
    [itemHeight]
  );

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
    listRef,
    onItemsRendered,
    getItemSize,
  };
}
