import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { toAuthUser } from "@/lib/session";
import { registerSchema } from "@/lib/validation";
import {
  apiSuccess,
  apiError,
  apiErrors,
  apiValidationError,
} from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createVerificationToken } from "@/lib/emailVerification";
import { buildEmailVerificationEmail, sendEmail } from "@/lib/email";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registration attempts per 15 minutes per IP.
    const ip = getClientIp(request);
    const limitResult = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!limitResult.allowed) {
      return apiErrors.rateLimited();
    }

    const body = await request.json();
    const input = registerSchema.parse(body);

    // Check for existing username/email up front so we can return a clear,
    // field-specific error instead of relying solely on the DB unique
    // constraint (which would throw a generic P2002 error).
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: input.username }, { email: input.email }],
      },
      select: { username: true, email: true },
    });

    if (existing) {
      const fieldErrors: Record<string, string[]> = {};
      if (existing.username === input.username) {
        fieldErrors.username = ["This username is already taken"];
      }
      if (existing.email === input.email) {
        fieldErrors.email = ["This email is already registered"];
      }
      return apiError("Registration failed.", 409, {
        code: "CONFLICT",
        fieldErrors,
      });
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        displayName: input.username,
      },
    });

    // Email verification: create a token and email it. Intentionally
    // does NOT call setAuthCookies() -- per the Phase 1 design, a freshly
    // registered account is unverified (emailVerifiedAt is null) and
    // must not have an active session until they click the link.
    const { rawToken } = await createVerificationToken(user.id);

    // Prefer the configured public URL; if it's not set, derive the
    // base URL from the actual incoming request instead of a hardcoded
    // localhost fallback -- this keeps verification links correct in
    // any environment (staging, a teammate's machine, a container)
    // where NEXT_PUBLIC_APP_URL was never set, rather than silently
    // emailing a link that could never resolve for the recipient.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    const emailContent = buildEmailVerificationEmail({ verifyUrl });
    const emailResult = await sendEmail({ to: user.email, ...emailContent });

    // Best-effort: the account and verification token already exist at
    // this point regardless of whether the send succeeded. A transient
    // SMTP failure here should not fail the whole registration -- the
    // user can use "resend verification" once email delivery is healthy
    // again. We still log the failure so it's visible server-side.
    if (!emailResult.sent) {
      console.error("[REGISTER] Verification email failed to send:", emailResult.error);
    }

    return apiSuccess({ user: toAuthUser(user) }, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    console.error("[REGISTER ERROR]", err);
    return apiErrors.internal();
  }
}