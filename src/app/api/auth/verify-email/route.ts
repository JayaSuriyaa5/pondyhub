import { NextRequest } from "next/server";
import { consumeVerificationToken } from "@/lib/emailVerification";
import { apiSuccess, apiError } from "@/lib/apiResponse";

// GET /api/auth/verify-email?token=... -- the endpoint a user's browser
// hits when they click the link in their verification email. The token
// itself is the only secret involved; there is no credential-guessing
// surface here, so this route is not rate limited the way
// login/register/resend-verification are.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return apiError("No verification token was provided.", 400, {
      code: "MISSING_TOKEN",
    });
  }

  try {
    const result = await consumeVerificationToken(token);

    if (!result.ok) {
      switch (result.reason) {
        case "EXPIRED":
          return apiError(
            "This verification link has expired. Please request a new one.",
            410,
            { code: "TOKEN_EXPIRED" }
          );
        case "ALREADY_USED":
          return apiError(
            "This verification link has already been used.",
            409,
            { code: "TOKEN_ALREADY_USED" }
          );
        case "NOT_FOUND":
        default:
          return apiError(
            "This verification link is invalid.",
            400,
            { code: "TOKEN_INVALID" }
          );
      }
    }

    return apiSuccess({ verified: true });
  } catch (err) {
    console.error("[VERIFY EMAIL ERROR]", err);
    return apiError("Something went wrong while verifying your email. Please try again.", 500, {
      code: "INTERNAL_ERROR",
    });
  }
}