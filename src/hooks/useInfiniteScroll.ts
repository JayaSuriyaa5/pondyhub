import { useEffect, useRef } from "react";

/**
 * Attaches an IntersectionObserver to a sentinel element; calls
 * `onIntersect` whenever that sentinel scrolls into view. Used to drive
 * infinite-scroll "load more" behavior without a scroll event listener
 * (which would fire far more often than needed).
 */
export function useInfiniteScroll(
  onIntersect: () => void,
  options: { enabled: boolean; rootMargin?: string }
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!options.enabled) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersect();
        }
      },
      { rootMargin: options.rootMargin ?? "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled, onIntersect]);

  return sentinelRef;
}
