import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessTokenEdge, getAccessTokenFromRequest } from "@/lib/edgeAuth";

// Routes that require *any* authenticated user.
const PROTECTED_PAGE_PREFIXES = ["/posts/new", "/settings", "/notifications"];

// Routes that require ADMIN or MODERATOR role.
const ADMIN_PAGE_PREFIXES = ["/admin"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = matchesPrefix(pathname, ADMIN_PAGE_PREFIXES);
  const isProtectedRoute = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);

  if (!isAdminRoute && !isProtectedRoute) {
    return NextResponse.next();
  }

  // Edge Runtime cannot use jsonwebtoken (src/lib/auth.ts) or
  // next/headers (src/lib/session.ts) -- see src/lib/edgeAuth.ts for why.
  const token = getAccessTokenFromRequest(request);
  const payload = token ? await verifyAccessTokenEdge(token) : null;

  // Not logged in at all (or access token expired/invalid) -> send to
  // login. We preserve the original destination as a `next` query param
  // so the login page can redirect back after a successful sign-in.
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in but not privileged enough for /admin.
  if (isAdminRoute && payload.role !== "ADMIN" && payload.role !== "MODERATOR") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/posts/new", "/settings/:path*", "/notifications/:path*"],
};
