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
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  total: number;
  reload: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export function useInfiniteScroll<T>({ fetchData, limit = 50, enabled = true, threshold = 200 }: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const initialLoadDone = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !enabled) return;

    setLoading(true);
    try {
      const response = await fetchData(skip, limit);

      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => (item as { id: string }).id));
        const newItems = response.items.filter((item) => !existingIds.has((item as { id: string }).id));
        return [...prev, ...newItems];
      });
      setHasMore(response.has_more);
      setTotal(response.total);
      setSkip((prev) => prev + limit);
    } catch (error) {
      console.error("Failed to load more items:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchData, skip, limit, loading, hasMore, enabled]);

  const reload = useCallback(async () => {
    setItems([]);
    setSkip(0);
    setHasMore(true);
    setTotal(0);
    initialLoadDone.current = false;
  }, []);

  // Initial load
  useEffect(() => {
    if (enabled && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadMore();
    }
  }, [enabled, loadMore]);

  // Scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !enabled) return;

    const handleScroll = () => {
      if (loading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceToBottom < threshold) {
        loadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore, loadMore, enabled, threshold]);

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
