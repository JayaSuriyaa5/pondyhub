"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import type { AdminUserDTO, PaginatedResult } from "@/types";

export function UsersTable() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);

    fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: PaginatedResult<AdminUserDTO> }) => {
        if (json.success && json.data) setUsers(json.data.items);
      })
      .finally(() => setIsLoading(false));
  }, [debouncedSearch]);

  async function updateUser(id: string, patch: { isBanned?: boolean; role?: AdminUserDTO["role"] }) {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json: { success: boolean; data?: { user: AdminUserDTO }; error?: { message: string } } =
        await res.json();

      if (!json.success || !json.data) {
        setError(json.error?.message || "Couldn't update this user.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isBanned: json.data!.user.isBanned, role: json.data!.user.role } : u))
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
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
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50 dark:divide-abyss-800">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isPending = pendingId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-brand-50/30 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/u/${u.username}`} className="flex items-center gap-2.5">
                        <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="sm" />
                        <div>
                          <p className="font-medium text-coastal-ink dark:text-slate-200">
                            {u.displayName || u.username}
                          </p>
                          <p className="text-xs text-slate-400">@{u.username}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf || isPending}
                        onChange={(e) => updateUser(u.id, { role: e.target.value as AdminUserDTO["role"] })}
                        className="rounded-lg border border-slate-200 bg-coastal-shell px-2 py-1 text-xs disabled:opacity-50 dark:border-abyss-700 dark:bg-abyss-900 dark:text-slate-100"
                      >
                        <option value="USER">User</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.isBanned ? (
                        <Badge tone="danger">Banned</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {u.postCount} posts · {u.commentCount} comments
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.isBanned ? "outline" : "danger"}
                        disabled={isSelf}
                        isLoading={isPending}
                        onClick={() => updateUser(u.id, { isBanned: !u.isBanned })}
                      >
                        {u.isBanned ? "Unban" : "Ban"}
                      </Button>
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
