import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  safeVerifyAccessToken,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth";
import type { AuthUser } from "@/types";
import type { User } from "@prisma/client";

export const ACCESS_TOKEN_COOKIE = "forum_access_token";
export const REFRESH_TOKEN_COOKIE = "forum_refresh_token";

const isProd = process.env.NODE_ENV === "production";

// ----------------------------------------------------------------------------
// Cookie writers — used in route handlers (login, register, refresh, logout)
// ----------------------------------------------------------------------------

export async function setAuthCookies(user: { id: string; username: string; role: User["role"] }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken({ id: user.id });

  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes, mirrors JWT_ACCESS_EXPIRES_IN
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days, mirrors JWT_REFRESH_EXPIRES_IN
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

// ----------------------------------------------------------------------------
// toAuthUser — strips sensitive fields (passwordHash) before sending to client
// ----------------------------------------------------------------------------

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    isBanned: user.isBanned,
    createdAt: user.createdAt.toISOString(),
  };
}

// ----------------------------------------------------------------------------
// getCurrentUser — for use in Server Components / Route Handlers (reads
// cookies() directly, no NextRequest needed)
// ----------------------------------------------------------------------------

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const payload = safeVerifyAccessToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.isBanned) return null;

  return toAuthUser(user);
}

// ----------------------------------------------------------------------------
// requireUser — throws-free guard for route handlers. Returns the AuthUser
// or null; the caller decides how to respond (401 etc).
// ----------------------------------------------------------------------------

export async function requireUser(): Promise<AuthUser | null> {
  return getCurrentUser();
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") return null;
  return user;
}
