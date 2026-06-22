import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { safeVerifyRefreshToken } from "@/lib/auth";
import {
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  toAuthUser,
} from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";

/**
 * Called by the client's fetch wrapper whenever an access-token-protected
 * request comes back 401. Exchanges a still-valid refresh token (httpOnly
 * cookie) for a fresh access token + refresh token pair, implementing
 * silent re-authentication without asking the user to log in again every
 * 15 minutes.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      return apiErrors.unauthorized();
    }

    const payload = safeVerifyRefreshToken(refreshToken);
    if (!payload) {
      await clearAuthCookies();
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isBanned) {
      await clearAuthCookies();
      return apiErrors.unauthorized();
    }

    // Issue a fresh pair (rotates the refresh token too, limiting the
    // window in which a leaked refresh token remains useful).
    await setAuthCookies(user);

    return apiSuccess({ user: toAuthUser(user) });
  } catch (err) {
    console.error("[REFRESH ERROR]", err);
    return apiErrors.internal();
  }
}
