import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { setAuthCookies, toAuthUser } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { apiSuccess, apiError, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 login attempts per 15 minutes per IP, to slow down
    // credential-stuffing / brute-force attempts without locking out a
    // legitimate user who mistypes their password a couple of times.
    const ip = getClientIp(request);
    const limitResult = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!limitResult.allowed) {
      return apiErrors.rateLimited();
    }

    const body = await request.json();
    const input = loginSchema.parse(body);

    const identifier = input.identifier.trim();
    const isEmail = identifier.includes("@");

    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifier.toLowerCase() } : { username: identifier },
    });

    // Use the same generic error message whether the account doesn't exist
    // or the password is wrong, so we don't leak which usernames/emails are
    // registered (a common account-enumeration vector).
    const genericError = () =>
      apiError("Invalid username/email or password.", 401, { code: "INVALID_CREDENTIALS" });

    if (!user) {
      return genericError();
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      return genericError();
    }

    if (user.isBanned) {
      return apiError(
        "Your account has been suspended. Contact support if you believe this is a mistake.",
        403,
        { code: "ACCOUNT_BANNED" }
      );
    }

    await setAuthCookies(user);

    return apiSuccess({ user: toAuthUser(user) });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    console.error("[LOGIN ERROR]", err);
    return apiErrors.internal();
  }
}
