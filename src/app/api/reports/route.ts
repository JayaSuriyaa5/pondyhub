import { NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { createReportSchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import {
  fileReport,
  DuplicateReportError,
  ReportTargetNotFoundError,
} from "@/lib/reporting";
import { ZodError } from "zod";

// POST /api/reports — file a report against a post or comment. Requires
// auth (anonymous reporting isn't supported, same rationale as voting:
// we need a reporterId to enforce "one report per user per target").
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    // Generous but real cap -- reporting is rare relative to voting/
    // commenting, so a tighter limit than vote/comment rate limits is
    // appropriate; this still allows reporting many different pieces of
    // content in a burst (e.g. cleaning up a spam wave) without false
    // positives on legitimate use.
    const limitResult = rateLimit(`create-report:${user.id}`, 20, 10 * 60 * 1000);
    if (!limitResult.allowed) return apiErrors.rateLimited();

    const body = await request.json();
    const input = createReportSchema.parse(body);

    const result = await fileReport({
      reporterId: user.id,
      reason: input.reason,
      detail: input.detail,
      target: input.postId ? { postId: input.postId } : { commentId: input.commentId! },
    });

    return apiSuccess({ reported: true, autoHidden: result.autoHidden }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err instanceof DuplicateReportError) {
      return apiErrors.conflict(err.message);
    }
    if (err instanceof ReportTargetNotFoundError) {
      return apiErrors.notFound(err.message.replace(" not found.", ""));
    }
    console.error("[REPORTS POST ERROR]", err);
    return apiErrors.internal();
  }
}
