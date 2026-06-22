import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";
import type { PaginatedResult, ProfileCommentDTO } from "@/types";

interface Params {
  params: Promise<{ username: string }>;
}

const PAGE_SIZE = 10;

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { username } = await params;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return apiErrors.notFound("User");

    const currentUser = await getCurrentUser();
    const isSelfOrMod =
      currentUser &&
      (currentUser.username === username || currentUser.role === "ADMIN" || currentUser.role === "MODERATOR");

    const comments = await prisma.comment.findMany({
      where: {
        authorId: user.id,
        // Hide soft-deleted comments from the public profile view unless
        // the viewer is the comment's own author or a moderator/admin.
        ...(isSelfOrMod ? {} : { deleted: false }),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        deleted: true,
        score: true,
        createdAt: true,
        post: { select: { id: true, title: true } },
      },
    });

    const hasMore = comments.length > PAGE_SIZE;
    const pageItems = hasMore ? comments.slice(0, PAGE_SIZE) : comments;

    const result: PaginatedResult<ProfileCommentDTO> = {
      items: pageItems.map((c) => ({
        id: c.id,
        content: c.deleted ? "[deleted]" : c.content,
        deleted: c.deleted,
        score: c.score,
        createdAt: c.createdAt.toISOString(),
        post: c.post,
      })),
      nextCursor: hasMore ? pageItems[pageItems.length - 1].id : null,
      hasMore,
    };

    return apiSuccess(result);
  } catch (err) {
    console.error("[USER COMMENTS ERROR]", err);
    return apiErrors.internal();
  }
}
