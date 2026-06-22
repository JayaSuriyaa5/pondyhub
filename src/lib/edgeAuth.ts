import { jwtVerify } from "jose";
import type { JwtAccessPayload } from "@/types";

const ACCESS_TOKEN_COOKIE = "forum_access_token";

/**
 * Edge-runtime-safe JWT verification, for middleware.ts ONLY.
 *
 * middleware.ts runs in the Edge Runtime, which does not support Node's
 * `crypto` module -- so it cannot use `jsonwebtoken` (src/lib/auth.ts) or
 * anything that transitively imports `next/headers` (src/lib/session.ts).
 * `jose` is built on Web Crypto APIs instead, which the Edge Runtime does
 * support. This file is the one place allowed to be imported from
 * middleware.ts for token verification.
 *
 * Route Handlers and Server Components should keep using
 * src/lib/auth.ts / src/lib/session.ts as before (they run in the Node.js
 * runtime, where jsonwebtoken works fine) -- this file exists solely to
 * satisfy the Edge Runtime constraint in middleware.
 */
export async function verifyAccessTokenEdge(token: string): Promise<JwtAccessPayload | null> {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as unknown as JwtAccessPayload;
  } catch {
    return null;
  }
}

export function getAccessTokenFromRequest(request: {
  cookies: { get(name: string): { value: string } | undefined };
}): string | null {
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}
