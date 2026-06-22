import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";
import type { PaginatedResult, AdminUserDTO } from "@/types";

const PAGE_SIZE = 20;

// GET /api/admin/users — paginated list of all users, for the admin
// dashboard's user management table. Admin/moderator only.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const q = url.searchParams.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isBanned: true,
        createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });

    const hasMore = users.length > PAGE_SIZE;
    const pageItems = hasMore ? users.slice(0, PAGE_SIZE) : users;

    const result: PaginatedResult<AdminUserDTO> = {
      items: pageItems.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        isBanned: u.isBanned,
        createdAt: u.createdAt.toISOString(),
        postCount: u._count.posts,
        commentCount: u._count.comments,
      })),
      nextCursor: hasMore ? pageItems[pageItems.length - 1].id : null,
      hasMore,
    };

    return apiSuccess(result);
  } catch (err) {
    console.error("[ADMIN USERS GET ERROR]", err);
    return apiErrors.internal();
  }
}
