"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { NotificationPayload, PaginatedResult } from "@/types";

interface NotificationContextValue {
  notifications: NotificationPayload[];
  unreadCount: number;
  isLoading: boolean;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    fetch("/api/notifications", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: PaginatedResult<NotificationPayload> }) => {
        if (json.success && json.data) {
          setNotifications(json.data.items);
          setCursor(json.data.nextCursor);
          setHasMore(json.data.hasMore);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    function handleNew(payload: NotificationPayload) {
      setNotifications((prev) => [payload, ...prev]);
    }

    socket.on("notification:new", handleNew);
    return () => {
      socket.off("notification:new", handleNew);
    };
  }, [socket]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      // Best-effort; next full reload reconciles from the server.
    }
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // Best-effort, same rationale as markAllRead.
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications?cursor=${cursor}`, { cache: "no-store" });
      const json: { success: boolean; data?: PaginatedResult<NotificationPayload> } = await res.json();
      if (json.success && json.data) {
        setNotifications((prev) => [...prev, ...json.data!.items]);
        setCursor(json.data.nextCursor);
        setHasMore(json.data.hasMore);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isLoading, markAllRead, markOneRead, loadMore, hasMore }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
