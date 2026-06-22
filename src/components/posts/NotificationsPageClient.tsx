"use client";

import Link from "next/link";
import clsx from "clsx";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/formatTime";
import type { NotificationPayload } from "@/types";

function notificationHref(n: NotificationPayload): string {
  if (n.postId) return `/posts/${n.postId}#comments`;
  return "#";
}

export function NotificationsPageClient() {
  const { notifications, unreadCount, isLoading, markAllRead, markOneRead, loadMore, hasMore } =
    useNotifications();

  return (
    <div>
      {unreadCount > 0 && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => markAllRead()}>
            Mark all as read
          </Button>
        </div>
      )}

      <div className="surface-card divide-y divide-brand-50 dark:divide-abyss-800">
        {notifications.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="text-3xl" aria-hidden="true">
              🔔
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You don&apos;t have any notifications yet.
            </p>
          </div>
        )}

        {notifications.map((n) => (
          <Link
            key={n.id}
            href={notificationHref(n)}
            onClick={() => !n.read && markOneRead(n.id)}
            className={clsx(
              "flex items-start gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-brand-50/40 dark:hover:bg-white/5",
              !n.read && "bg-brand-50/50 dark:bg-brand-900/10"
            )}
          >
            {!n.read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coastal-terracotta" aria-hidden="true" />
            )}
            <div className={clsx(!n.read ? "" : "pl-5")}>
              <p className="text-coastal-ink dark:text-slate-200">
                <span className="font-medium">@{n.actorUsername}</span> {n.message}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {formatRelativeTime(n.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" isLoading={isLoading} onClick={() => loadMore()}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
