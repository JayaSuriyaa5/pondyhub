import type { Socket } from "socket.io";
import { safeVerifyAccessToken } from "../auth";
import type { JwtAccessPayload } from "../../types";

// Duplicated from src/lib/session.ts's ACCESS_TOKEN_COOKIE constant
// rather than imported from it. session.ts imports `cookies` from
// `next/headers`, which is only safe to load inside a Next.js request
// context (Server Component / Route Handler) -- importing that module
// from this file would pull `next/headers` into the standalone Socket.IO
// server's module graph as well, which runs outside any Next.js request
// context and could break at startup. These two values must be kept in
// sync if the cookie name ever changes.
const ACCESS_TOKEN_COOKIE = "forum_access_token";

/**
 * Parses the forum_access_token cookie out of a raw Cookie header string.
 * Socket.IO handshakes carry cookies in `socket.handshake.headers.cookie`
 * exactly like a normal HTTP request, since the initial handshake is a
 * real HTTP request (even for the websocket transport) — so we reuse the
 * exact same JWT used by every other part of the app instead of inventing
 * a separate socket-specific auth scheme.
 */
function extractAccessToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === ACCESS_TOKEN_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export interface AuthenticatedSocketData {
  userId: string;
  username: string;
  role: JwtAccessPayload["role"];
}

/**
 * Socket.IO middleware: runs once per connection attempt. Populates
 * `socket.data` with the authenticated user's identity on success, or
 * rejects the connection if the access token is missing/invalid/expired.
 *
 * Note: because access tokens are short-lived (15 min), a socket
 * connection established with a valid token will eventually outlive that
 * token. We don't forcibly disconnect on expiry for this MVP — the socket
 * keeps working for its current session, and the client reconnects (with
 * a fresh cookie, after the HTTP-layer refresh flow runs) if the
 * connection drops for any other reason. A production-hardened version
 * could re-validate periodically and disconnect stale sockets.
 */
export function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
) {
  const cookieHeader = socket.handshake.headers.cookie;
  const token = extractAccessToken(cookieHeader);

  if (!token) {
    next(new Error("UNAUTHORIZED"));
    return;
  }

  const payload = safeVerifyAccessToken(token);
  if (!payload) {
    next(new Error("UNAUTHORIZED"));
    return;
  }

  const data: AuthenticatedSocketData = {
    userId: payload.sub,
    username: payload.username,
    role: payload.role,
  };
  socket.data = data;
  next();
}
