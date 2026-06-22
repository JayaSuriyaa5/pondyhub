"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Establishes (and tears down) a single Socket.IO client connection for
 * the lifetime of an authenticated session. The connection authenticates
 * via the same httpOnly access-token cookie used by every HTTP request --
 * socket.io-client sends cookies automatically for same-origin connections
 * when `withCredentials: true` is set, so no token handling is needed
 * here at all.
 *
 * Returns null when there's no logged-in user, since unauthenticated
 * visitors have nothing to subscribe to (no notifications, and post pages
 * still work fine without live comment updates -- they just rely on the
 * normal fetch-on-load behavior).
 */
export function useSocket(): Socket | null {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    if (socketRef.current) return;

    const instance = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = instance;
    setSocket(instance);

    return () => {
      instance.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return socket;
}
