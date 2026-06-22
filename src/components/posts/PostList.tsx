"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { PostCard } from "@/components/posts/PostCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { PostDTO, PostSort, PaginatedResult } from "@/types";

interface PostListProps {
  categorySlug?: string;
  authorUsername?: string;
  searchQuery?: string;
  initialSort?: PostSort;
}

const SORT_OPTIONS: { value: PostSort; label: string; icon: string }[] = [
  { value: "hot", label: "Hot", icon: "🔥" },
  { value: "new", label: "New", icon: "✨" },
  { value: "top", label: "Top", icon: "⬆" },
];

export function PostList({ categorySlug, authorUsername, searchQuery, initialSort = "hot" }: PostListProps) {
  const [sort, setSort] = useState<PostSort>(initialSort);
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against an in-flight fetch firing twice (e.g. fast scroll +
  // sort change racing each other).
  const requestIdRef = useRef(0);

  const fetchPosts = useCallback(
    async (opts: { reset: boolean }) => {
      const thisRequestId = ++requestIdRef.current;
      if (opts.reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("sort", sort);
        params.set("limit", "10");
        if (categorySlug) params.set("categorySlug", categorySlug);
        if (authorUsername) params.set("authorUsername", authorUsername);
        if (searchQuery) params.set("q", searchQuery);
        if (!opts.reset && cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/posts?${params.toString()}`, { cache: "no-store" });
        const json: { success: boolean; data?: PaginatedResult<PostDTO>; error?: { message: string } } =
          await res.json();

        // If a newer request started while this one was in flight, ignore
        // this stale response.
        if (thisRequestId !== requestIdRef.current) return;

        if (!json.success || !json.data) {
          setError(json.error?.message || "Couldn't load posts. Please try again.");
          return;
        }

        setPosts((prev) => (opts.reset ? json.data!.items : [...prev, ...json.data!.items]));
        setCursor(json.data.nextCursor);
        setHasMore(json.data.hasMore);
      } catch {
        if (thisRequestId === requestIdRef.current) {
          setError("Couldn't load posts. Check your connection and try again.");
        }
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sort, categorySlug, authorUsername, searchQuery]
  );

  // Re-fetch from scratch whenever sort/category/author/search changes.
  useEffect(() => {
    setCursor(null);
    fetchPosts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, categorySlug, authorUsername, searchQuery]);

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchPosts({ reset: false });
    }
  }, [fetchPosts, isLoading, isLoadingMore, hasMore]);

  const sentinelRef = useInfiniteScroll(loadMore, { enabled: hasMore && !isLoading });

  return (
    <div>
      {/* Sort tabs */}
      <div className="mb-4 flex items-center gap-1.5 rounded-xl bg-brand-50/70 p-1.5 dark:bg-abyss-800/60 w-fit">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
              sort === opt.value
                ? "bg-white text-coastal-ocean shadow-sm dark:bg-abyss-700 dark:text-brand-300"
                : "text-slate-500 hover:text-coastal-ink dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <span aria-hidden="true">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="surface-card mb-4 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeletons (initial load) */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && !error && (
        <div className="surface-card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <span className="text-3xl" aria-hidden="true">
            🌊
          </span>
          <p className="font-display text-lg text-coastal-ink dark:text-slate-100">
            {searchQuery ? "No posts match your search" : "No posts here yet"}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {searchQuery
              ? "Try a different search term, or start a new discussion."
              : "Be the first to start a discussion in this community."}
          </p>
        </div>
      )}

      {/* Post feed */}
      {!isLoading && posts.length > 0 && (
        <div className="flex flex-col gap-3">
          {posts.map((post, i) => (
            <div key={post.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}>
              <PostCard post={post} trending={sort === "hot" && i < 3} />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel + loading-more indicator */}
      {hasMore && !isLoading && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isLoadingMore && (
            <div className="flex flex-col gap-3 w-full">
              <PostCardSkeleton />
            </div>
          )}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          You&apos;ve reached the end of the tide 🌊
        </p>
      )}
    </div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="surface-card flex gap-1 overflow-hidden">
      <div className="w-14 shrink-0 border-r border-brand-100/60 dark:border-abyss-700" />
      <div className="flex-1 px-5 py-4">
        <div className="skeleton h-3 w-24 rounded-full" />
        <div className="skeleton mt-3 h-5 w-3/4 rounded-md" />
        <div className="skeleton mt-2 h-4 w-full rounded-md" />
        <div className="skeleton mt-1.5 h-4 w-2/3 rounded-md" />
        <div className="mt-4 flex items-center gap-3">
          <div className="skeleton h-6 w-6 rounded-full" />
          <div className="skeleton h-3 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
