import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";
import type { PaginatedResult, AdminPostDTO } from "@/types";

const PAGE_SIZE = 20;

// GET /api/admin/posts — full post list for moderation, including any
// unpublished posts (the public /api/posts route filters those out).
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const q = url.searchParams.get("q")?.trim();

    const posts = await prisma.post.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        published: true,
        score: true,
        createdAt: true,
        author: { select: { username: true } },
        category: { select: { name: true, slug: true } },
        _count: { select: { comments: true } },
      },
    });

    const hasMore = posts.length > PAGE_SIZE;
    const pageItems = hasMore ? posts.slice(0, PAGE_SIZE) : posts;

    const result: PaginatedResult<AdminPostDTO> = {
      items: pageItems.map((p) => ({
        id: p.id,
        title: p.title,
        published: p.published,
        score: p.score,
        commentCount: p._count.comments,
        author: p.author,
        category: p.category,
        createdAt: p.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? pageItems[pageItems.length - 1].id : null,
      hasMore,
    };

    return apiSuccess(result);
  } catch (err) {
    console.error("[ADMIN POSTS GET ERROR]", err);
    return apiErrors.internal();
  }
}
