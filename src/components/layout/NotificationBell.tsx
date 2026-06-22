"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useNotifications } from "@/context/NotificationContext";
import { formatRelativeTime } from "@/lib/formatTime";
import type { NotificationPayload } from "@/types";

function notificationHref(n: NotificationPayload): string {
  if (n.postId) return `/posts/${n.postId}#comments`;
  return "#";
}

function notificationText(n: NotificationPayload): string {
  return `@${n.actorUsername} ${n.message}`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-coastal-ink hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-white/5"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M6 8a6 6 0 1112 0c0 3 1 5 1.5 6H4.5C5 13 6 11 6 8z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.5 18a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coastal-terracotta px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-80 animate-scale-in rounded-xl glass-strong"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex items-center justify-between border-b border-white/30 px-4 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold text-coastal-ink dark:text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs font-medium text-coastal-ocean hover:underline dark:text-brand-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="scrollbar-thin max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                You&apos;re all caught up.
              </p>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <Link
                  key={n.id}
                  href={notificationHref(n)}
                  onClick={() => {
                    if (!n.read) markOneRead(n.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "block border-b border-white/20 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-white/40 dark:border-white/5 dark:hover:bg-white/5",
                    !n.read && "bg-brand-50/50 dark:bg-brand-900/10"
                  )}
                >
                  <p className="text-coastal-ink dark:text-slate-200">{notificationText(n)}</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
