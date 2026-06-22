import { NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { castPostVote } from "@/lib/voting";
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

    // Generous limit since voting is a frequent, low-cost action, but still
    // capped to blunt abusive vote-bot behavior.
    const limitResult = rateLimit(`vote:${user.id}`, 60, 60 * 1000);
    if (!limitResult.allowed) return apiErrors.rateLimited();

    const { id: postId } = await params;
    const body = await request.json();
    const { value } = voteSchema.parse(body);

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return apiErrors.notFound("Post");

    const result = await castPostVote(user.id, postId, value);

    return apiSuccess(result);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST VOTE ERROR]", err);
    return apiErrors.internal();
  }
}
