import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/session";
import { updatePostSchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { postSelect, toPostDTO } from "@/lib/postSerializer";
import { sanitizeHtml } from "@/lib/sanitize";
import { ZodError } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    const post = await prisma.post.findUnique({
      where: { id },
      select: postSelect(currentUser?.id ?? null),
    });

    if (!post) return apiErrors.notFound("Post");

    // Same visibility rule as the post detail page: a hidden post
    // (published: false) is only visible to its author or to a
    // moderator/admin, so the API doesn't leak content the UI is hiding.
    const viewerIsOwner = currentUser?.id === post.authorId;
    const viewerCanModerate = currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";
    if (!post.published && !viewerIsOwner && !viewerCanModerate) {
      return apiErrors.notFound("Post");
    }

    return apiSuccess({ post: toPostDTO(post) });
  } catch (err) {
    console.error("[POST GET ERROR]", err);
    return apiErrors.internal();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const { id } = await params;
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) return apiErrors.notFound("Post");

    const isOwner = existing.authorId === user.id;
    const isPrivileged = user.role === "ADMIN" || user.role === "MODERATOR";
    if (!isOwner && !isPrivileged) return apiErrors.forbidden();

    const body = await request.json();
    const input = updatePostSchema.parse(body);

    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) return apiErrors.notFound("Category");
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: sanitizeHtml(input.content) } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      },
      select: postSelect(user.id),
    });

    return apiSuccess({ post: toPostDTO(updated) });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST PATCH ERROR]", err);
    return apiErrors.internal();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const { id } = await params;
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) return apiErrors.notFound("Post");

    const isOwner = existing.authorId === user.id;
    const isPrivileged = user.role === "ADMIN" || user.role === "MODERATOR";
    if (!isOwner && !isPrivileged) return apiErrors.forbidden();

    // Hard delete: cascades to comments and votes per the schema's onDelete
    // rules. For a lighter-touch moderation action that preserves the post
    // and its comments, use PATCH /api/admin/posts/[id] to unpublish
    // (hide) it instead of deleting outright.
    await prisma.post.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[POST DELETE ERROR]", err);
    return apiErrors.internal();
  }
}
