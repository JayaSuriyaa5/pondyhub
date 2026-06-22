import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { updateCommentSchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { commentSelect, buildCommentTree } from "@/lib/commentSerializer";
import { sanitizeHtml } from "@/lib/sanitize";
import { ZodError } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const { id } = await params;
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing || existing.deleted) return apiErrors.notFound("Comment");

    if (existing.authorId !== user.id) {
      return apiErrors.forbidden();
    }

    const body = await request.json();
    const input = updateCommentSchema.parse(body);

    const updated = await prisma.comment.update({
      where: { id },
      data: { content: sanitizeHtml(input.content) },
      select: commentSelect(user.id),
    });

    const tree = buildCommentTree([updated]);

    return apiSuccess({ comment: tree[0] });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[COMMENT PATCH ERROR]", err);
    return apiErrors.internal();
  }
}

// DELETE — soft delete. We never hard-delete a comment that might have
// replies: instead we flag it `deleted` and mask its content/author when
// serializing, so the thread structure (replies) stays intact. Moderators
// and admins can delete any comment; authors can delete their own.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const { id } = await params;
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) return apiErrors.notFound("Comment");

    const isOwner = existing.authorId === user.id;
    const isPrivileged = user.role === "ADMIN" || user.role === "MODERATOR";
    if (!isOwner && !isPrivileged) return apiErrors.forbidden();

    await prisma.comment.update({
      where: { id },
      data: { deleted: true, content: "" },
    });

    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[COMMENT DELETE ERROR]", err);
    return apiErrors.internal();
  }
}
