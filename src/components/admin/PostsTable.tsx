"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/formatTime";
import type { AdminPostDTO, PaginatedResult } from "@/types";

export function PostsTable() {
  const [posts, setPosts] = useState<AdminPostDTO[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadPosts() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);

    fetch(`/api/admin/posts?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: PaginatedResult<AdminPostDTO> }) => {
        if (json.success && json.data) setPosts(json.data.items);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  async function togglePublished(id: string, published: boolean) {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      const json: { success: boolean; error?: { message: string } } = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Couldn't update this post.");
        return;
      }
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, published } : p)));
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Permanently delete this post and all its comments?")) return;
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      const json: { success: boolean; error?: { message: string } } = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Couldn't delete this post.");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts by title..."
          className="w-full max-w-xs rounded-xl border border-slate-200 bg-coastal-shell px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coastal-ocean dark:border-abyss-700 dark:bg-abyss-900 dark:text-slate-100"
        />
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50/50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-abyss-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50 dark:divide-abyss-800">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading posts...
                  </td>
                </tr>
              )}
              {!isLoading && posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No posts found.
                  </td>
                </tr>
              )}
              {posts.map((post) => {
                const isPending = pendingId === post.id;
                return (
                  <tr key={post.id} className="hover:bg-brand-50/30 dark:hover:bg-white/[0.02]">
                    <td className="max-w-[220px] px-4 py-3">
                      <Link
                        href={`/posts/${post.id}`}
                        className="line-clamp-1 font-medium text-coastal-ink hover:text-coastal-ocean dark:text-slate-200 dark:hover:text-brand-300"
                      >
                        {post.title}
                      </Link>
                      <span className="text-xs text-slate-400">{post.commentCount} comments · {post.score} pts</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">@{post.author.username}</td>
                    <td className="px-4 py-3">
                      <Badge tone="brand">{post.category.name}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {post.published ? (
                        <Badge tone="success">Published</Badge>
                      ) : (
                        <Badge tone="warning">Hidden</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatRelativeTime(post.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={isPending}
                          onClick={() => togglePublished(post.id, !post.published)}
                        >
                          {post.published ? "Hide" : "Show"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={isPending}
                          onClick={() => handleDelete(post.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
