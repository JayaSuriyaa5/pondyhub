"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/formatTime";
import type { AdminReportGroupDTO, PaginatedResult } from "@/types";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  SCAM_FRAUD: "Scam/Fraud",
  HARASSMENT: "Harassment",
  FAKE_INFORMATION: "Fake Information",
  NSFW: "NSFW",
  OTHER: "Other",
};

type StatusFilter = "PENDING" | "RESOLVED" | "ALL";

export function ReportsTable() {
  const [groups, setGroups] = useState<AdminReportGroupDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadReports() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/admin/reports?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: PaginatedResult<AdminReportGroupDTO> }) => {
        if (json.success && json.data) setGroups(json.data.items);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleAction(
    group: AdminReportGroupDTO,
    action: "DISMISS" | "DELETE_CONTENT" | "BAN_USER"
  ) {
    const key = `${group.targetType}:${group.targetId}`;

    if (action === "DELETE_CONTENT" && !window.confirm(`Permanently delete this ${group.targetType}?`)) {
      return;
    }
    if (action === "BAN_USER" && !window.confirm(`Ban @${group.author.username}? They won't be able to log in.`)) {
      return;
    }

    setPendingKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${group.targetType}/${group.targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json: { success: boolean; error?: { message: string } } = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Couldn't resolve this report.");
        return;
      }

      // Remove the resolved group from the current (PENDING-filtered)
      // view rather than re-fetching the whole list, for snappier UI --
      // mirrors the optimistic-removal pattern in PostsTable's
      // handleDelete.
      setGroups((prev) => prev.filter((g) => `${g.targetType}:${g.targetId}` !== key));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 rounded-xl bg-brand-50/70 p-1.5 dark:bg-abyss-800/60 w-fit">
        {(["PENDING", "RESOLVED", "ALL"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all duration-200",
              statusFilter === s
                ? "bg-white text-coastal-ocean shadow-sm dark:bg-abyss-700 dark:text-brand-300"
                : "text-slate-500 hover:text-coastal-ink dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {s === "ALL" ? "All" : s.toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading reports...</p>}

      {!isLoading && groups.length === 0 && (
        <div className="surface-card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <span className="text-3xl" aria-hidden="true">✅</span>
          <p className="font-display text-lg text-coastal-ink dark:text-slate-100">
            {statusFilter === "PENDING" ? "No pending reports" : "Nothing here"}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {statusFilter === "PENDING"
              ? "The queue is clear. New reports will show up here."
              : "Try a different filter."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const key = `${group.targetType}:${group.targetId}`;
          const isPending = pendingKey === key;
          const authorName = group.author.displayName || group.author.username;
          const contentHref =
            group.targetType === "post"
              ? `/posts/${group.targetId}`
              : `/posts/${group.postIdForComment}#comments`;

          return (
            <div key={key} className="surface-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Badge tone={group.targetType === "post" ? "brand" : "neutral"}>
                      {group.targetType === "post" ? "Post" : "Comment"}
                    </Badge>
                    {group.contentHidden && <Badge tone="warning">Auto-hidden</Badge>}
                    {group.status === "RESOLVED" && <Badge tone="success">Resolved</Badge>}
                    <span>·</span>
                    <span>Last reported {formatRelativeTime(group.latestReportAt)}</span>
                  </div>

                  <Link
                    href={contentHref}
                    className="mt-1.5 block line-clamp-2 text-sm font-medium text-coastal-ink hover:text-coastal-ocean dark:text-slate-100 dark:hover:text-brand-300"
                  >
                    {group.contentPreview}
                  </Link>

                  <Link
                    href={`/u/${group.author.username}`}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-500 hover:text-coastal-ocean dark:text-slate-400 dark:hover:text-brand-300"
                  >
                    <Avatar src={group.author.avatarUrl} name={authorName} size="sm" />
                    <span>by {authorName}</span>
                  </Link>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Array.from(new Set(group.reasons)).map((reason) => (
                      <Badge key={reason} tone="terracotta">
                        {REASON_LABELS[reason] ?? reason}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Report / reporter counts */}
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                  <span className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
                    {group.reportCount}
                  </span>
                  <span className="text-xs text-slate-400">
                    {group.reportCount === 1 ? "report" : "reports"}
                  </span>
                  <span className="text-xs text-slate-400">
                    from {group.reporterIds.length} {group.reporterIds.length === 1 ? "person" : "people"}
                  </span>
                </div>
              </div>

              {group.status === "PENDING" && (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-brand-50 pt-3 dark:border-abyss-800">
                  <Button
                    size="sm"
                    variant="ghost"
                    isLoading={isPending}
                    onClick={() => handleAction(group, "DISMISS")}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={isPending}
                    onClick={() => handleAction(group, "DELETE_CONTENT")}
                  >
                    Delete content
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={isPending}
                    onClick={() => handleAction(group, "BAN_USER")}
                  >
                    Ban user
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
