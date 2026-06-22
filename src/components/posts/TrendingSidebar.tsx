"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/formatTime";
import type { PostDTO, PaginatedResult } from "@/types";

/**
 * Compact "Trending Discussions" panel for the home feed sidebar. Pulls
 * the top 5 posts sorted by score over all time. A future iteration could
 * scope this to "last 24h" via a dedicated query param once there's
 * enough traffic for that window to be meaningful.
 */
export function TrendingSidebar() {
  const [posts, setPosts] = useState<PostDTO[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posts?sort=top&limit=5", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: PaginatedResult<PostDTO> }) => {
        if (!cancelled && json.success && json.data) setPosts(json.data.items);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          🔥
        </span>
        <h2 className="font-display text-lg font-medium text-coastal-ink dark:text-white">
          Trending Discussions
        </h2>
      </div>
      <div className="tide-divider mb-4 opacity-50" />

      {posts === null && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-full rounded-md" />
                <div className="skeleton mt-1.5 h-3 w-2/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {posts !== null && posts.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No trending discussions yet — start one!
        </p>
      )}

      {posts !== null && posts.length > 0 && (
        <ol className="flex flex-col gap-3.5">
          {posts.map((post, index) => (
            <li key={post.id}>
              <Link href={`/posts/${post.id}`} className="group flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coastal-ocean to-coastal-lagoon text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-coastal-ink transition-colors group-hover:text-coastal-ocean dark:text-slate-100 dark:group-hover:text-brand-300">
                    {post.title}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Avatar src={post.author.avatarUrl} name={post.author.displayName || post.author.username} size="sm" className="h-4 w-4 text-[8px]" />
                    <span>{post.author.displayName || post.author.username}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.score} pts</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
