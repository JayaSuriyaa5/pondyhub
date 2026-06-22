import { NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { castCommentVote } from "@/lib/voting";
import { voteSchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ZodError } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const limitResult = rateLimit(`vote:${user.id}`, 60, 60 * 1000);
    if (!limitResult.allowed) return apiErrors.rateLimited();

    const { id: commentId } = await params;
    const body = await request.json();
    const { value } = voteSchema.parse(body);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, deleted: true },
    });
    if (!comment || comment.deleted) return apiErrors.notFound("Comment");

    const result = await castCommentVote(user.id, commentId, value);

    return apiSuccess(result);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[COMMENT VOTE ERROR]", err);
    return apiErrors.internal();
  }
}
