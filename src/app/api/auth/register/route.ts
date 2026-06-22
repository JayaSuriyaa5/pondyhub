import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { setAuthCookies, toAuthUser } from "@/lib/session";
import { registerSchema } from "@/lib/validation";
import {
  apiSuccess,
  apiError,
  apiErrors,
  apiValidationError,
} from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
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

    await setAuthCookies(user);

    return apiSuccess({ user: toAuthUser(user) }, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    console.error("[REGISTER ERROR]", err);
    return apiErrors.internal();
  }
}
