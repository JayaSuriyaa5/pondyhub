import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { resendVerificationSchema } from "@/lib/validation";
import { apiSuccess, apiError, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createVerificationToken } from "@/lib/emailVerification";
import { buildEmailVerificationEmail, sendEmail } from "@/lib/email";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    // Tighter than login's 10/15min -- resend is a lower-friction
    // repeat-trigger (no new information needed per attempt) than a
    // login guess, so it gets a stricter window.
    const ip = getClientIp(request);
    const limitResult = rateLimit(`resend-verification:${ip}`, 3, 15 * 60 * 1000);
    if (!limitResult.allowed) {
      return apiErrors.rateLimited();
    }

    const body = await request.json();
    const input = resendVerificationSchema.parse(body);

    const identifier = input.identifier.trim();
    const isEmail = identifier.includes("@");

    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifier.toLowerCase() } : { username: identifier },
    });

    // Same anti-enumeration posture as login: identical generic message
    // whether the account doesn't exist or the password is wrong, so
    // this never becomes a public "does this email exist" oracle.
    const genericError = () =>
      apiError("Invalid username/email or password.", 401, { code: "INVALID_CREDENTIALS" });

    if (!user) {
      return genericError();
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      return genericError();
    }

    // Safe to state plainly (not a generic error) for the same reason
    // login's UNVERIFIED_EMAIL message is safe: the password was just
    // verified correct, so this reveals nothing an attacker didn't
    // already have to prove first.
    if (user.emailVerifiedAt !== null) {
      return apiError("This account is already verified. You can log in normally.", 409, {
        code: "ALREADY_VERIFIED",
      });
    }

    const { rawToken } = await createVerificationToken(user.id);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    const emailContent = buildEmailVerificationEmail({ verifyUrl });
    const emailResult = await sendEmail({ to: user.email, ...emailContent });

    // Best-effort, same rationale as register/route.ts: the new token
    // already exists regardless of send success, so a transient SMTP
    // failure doesn't need to fail this request -- the user can simply
    // try resending again once delivery is healthy.
    if (!emailResult.sent) {
      console.error("[RESEND VERIFICATION] Email failed to send:", emailResult.error);
    }

    return apiSuccess({ resent: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    console.error("[RESEND VERIFICATION ERROR]", err);
    return apiErrors.internal();
  }
}