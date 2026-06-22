import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";
import type { NotificationPayload, PaginatedResult } from "@/types";

const PAGE_SIZE = 20;

// GET /api/notifications — the current user's own notifications, newest
// first. Used both for the initial load in NotificationContext and for
// "load more" pagination via ?cursor=.
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const notifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notifications.length > PAGE_SIZE;
    const pageItems = hasMore ? notifications.slice(0, PAGE_SIZE) : notifications;

    const result: PaginatedResult<NotificationPayload> = {
      items: pageItems.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        actorUsername: n.actorUsername,
        postId: n.postId,
        commentId: n.commentId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? pageItems[pageItems.length - 1].id : null,
      hasMore,
    };

    return apiSuccess(result);
  } catch (err) {
    console.error("[NOTIFICATIONS GET ERROR]", err);
    return apiErrors.internal();
  }
}
