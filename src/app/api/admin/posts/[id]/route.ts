import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";

interface Params {
  params: Promise<{ id: string }>;
}

const adminUpdatePostSchema = z.object({
  published: z.boolean(),
});

// PATCH /api/admin/posts/[id] — unpublish (soft-hide) or republish a post.
// This is the "lighter touch" moderation action; hard delete remains
// available via DELETE /api/posts/[id] (owner-or-moderator gated).
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const { id } = await params;
    const body = await request.json();
    const input = adminUpdatePostSchema.parse(body);

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return apiErrors.notFound("Post");

    const updated = await prisma.post.update({
      where: { id },
      data: { published: input.published },
      select: { id: true, published: true },
    });

    return apiSuccess({ post: updated });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[ADMIN POST PATCH ERROR]", err);
    return apiErrors.internal();
  }
}
