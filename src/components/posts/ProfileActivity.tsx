"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PostCard } from "@/components/posts/PostCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/formatTime";
import type { PostDTO, ProfileCommentDTO, PaginatedResult } from "@/types";

interface ProfileActivityProps {
  username: string;
}

type Tab = "posts" | "comments";

export function ProfileActivity({ username }: ProfileActivityProps) {
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<PostDTO[] | null>(null);
  const [comments, setComments] = useState<ProfileCommentDTO[] | null>(null);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadPosts = useCallback(async (cursor?: string | null) => {
    const params = new URLSearchParams({ authorUsername: username, sort: "new", limit: "10" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/posts?${params.toString()}`, { cache: "no-store" });
    const json: { success: boolean; data?: PaginatedResult<PostDTO> } = await res.json();
    if (json.success && json.data) {
      setPosts((prev) => (cursor ? [...(prev ?? []), ...json.data!.items] : json.data!.items));
      setPostsCursor(json.data.nextCursor);
      setPostsHasMore(json.data.hasMore);
    }
  }, [username]);

  const loadComments = useCallback(async (cursor?: string | null) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/users/${username}/comments?${params.toString()}`, { cache: "no-store" });
    const json: { success: boolean; data?: PaginatedResult<ProfileCommentDTO> } = await res.json();
    if (json.success && json.data) {
      setComments((prev) => (cursor ? [...(prev ?? []), ...json.data!.items] : json.data!.items));
      setCommentsCursor(json.data.nextCursor);
      setCommentsHasMore(json.data.hasMore);
    }
  }, [username]);

  useEffect(() => {
    if (tab === "posts" && posts === null) loadPosts();
    if (tab === "comments" && comments === null) loadComments();
  }, [tab, posts, comments, loadPosts, loadComments]);

  async function handleLoadMore() {
    setIsLoadingMore(true);
    try {
      if (tab === "posts") await loadPosts(postsCursor);
      else await loadComments(commentsCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  const hasMore = tab === "posts" ? postsHasMore : commentsHasMore;

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 rounded-xl bg-brand-50/70 p-1.5 dark:bg-abyss-800/60 w-fit">
        {(["posts", "comments"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all duration-200",
              tab === t
                ? "bg-white text-coastal-ocean shadow-sm dark:bg-abyss-700 dark:text-brand-300"
                : "text-slate-500 hover:text-coastal-ink dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div className="flex flex-col gap-3">
          {posts === null && <ActivitySkeleton />}
          {posts !== null && posts.length === 0 && (
            <EmptyState message="No posts yet." />
          )}
          {posts?.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {tab === "comments" && (
        <>
          {comments === null && <ActivitySkeleton />}
          {comments !== null && comments.length === 0 && <EmptyState message="No comments yet." />}
          {comments !== null && comments.length > 0 && (
            <div className="surface-card divide-y divide-brand-50 dark:divide-abyss-800">
              {comments.map((comment) => (
                <Link
                  key={comment.id}
                  href={`/posts/${comment.post.id}#comments`}
                  className="block px-4 py-3 transition-colors hover:bg-brand-50/40 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>commented on</span>
                    <span className="font-medium text-coastal-ink dark:text-slate-200 line-clamp-1">
                      {comment.post.title}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                    <Badge tone="neutral" className="ml-auto">
                      {comment.score} pts
                    </Badge>
                  </div>
                  <p
                    className={clsx(
                      "mt-1.5 line-clamp-2 text-sm",
                      comment.deleted
                        ? "italic text-slate-400 dark:text-slate-500"
                        : "text-coastal-ink dark:text-slate-200"
                    )}
                  >
                    {comment.content}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" isLoading={isLoadingMore} onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-3 p-1">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3">
          <div className="skeleton h-4 w-2/3 rounded-md" />
          <div className="skeleton mt-2 h-3 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface-card flex flex-col items-center gap-1 px-6 py-12 text-center">
      <span className="text-2xl" aria-hidden="true">
        🌊
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
