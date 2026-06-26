import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";
import type { PaginatedResult, AdminReportGroupDTO } from "@/types";

const PAGE_SIZE = 20;

// GET /api/admin/reports — grouped report queue for the moderation
// dashboard. Groups individual Report rows by their target content (one
// row per reported post/comment, not one row per report), since that's
// what a moderator actually needs to act on: "this post has 14 reports
// for these reasons" rather than 14 separate identical-looking rows.
//
// Grouping is done in application code rather than a Prisma groupBy,
// because the natural group key here is polymorphic (postId OR
// commentId) -- same reasoning buildCommentTree() in
// commentSerializer.ts builds its tree in application code rather than
// fighting a recursive SQL CTE for a shape Prisma doesn't model well.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const statusFilter = url.searchParams.get("status"); // "PENDING" | "RESOLVED" | null (= all)

    // Fetch PENDING reports first (the actionable queue), most-reported
    // content surfaced first within that. We fetch reports themselves
    // (not pre-grouped) and group client-side in this handler, then
    // paginate over *groups*, not raw report rows.
    const reports = await prisma.report.findMany({
      where: statusFilter ? { status: statusFilter as "PENDING" | "RESOLVED" } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        detail: true,
        status: true,
        createdAt: true,
        reporterId: true,
        resolvedByUsername: true,
        resolvedAt: true,
        resolutionAction: true,
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            published: true,
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            deleted: true,
            postId: true,
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    // Group by target (postId or commentId) into one summary per
    // reported piece of content.
    const groups = new Map<string, AdminReportGroupDTO>();

    for (const r of reports) {
      const targetKey = r.post ? `post:${r.post.id}` : `comment:${r.comment!.id}`;

      if (!groups.has(targetKey)) {
        groups.set(targetKey, {
          targetType: r.post ? "post" : "comment",
          targetId: r.post ? r.post.id : r.comment!.id,
          contentPreview: r.post ? r.post.title : (r.comment!.content ?? "[deleted]"),
          contentHidden: r.post ? !r.post.published : Boolean(r.comment?.deleted),
          postIdForComment: r.comment ? r.comment.postId : undefined,
          author: r.post ? r.post.author : r.comment!.author,
          reportCount: 0,
          reporterIds: [],
          reasons: [],
          status: "RESOLVED", // will be downgraded to PENDING below if any report in the group is pending
          latestReportAt: r.createdAt.toISOString(),
        });
      }

      const group = groups.get(targetKey)!;
      group.reportCount += 1;
      if (!group.reporterIds.includes(r.reporterId)) group.reporterIds.push(r.reporterId);
      group.reasons.push(r.reason);
      if (r.status === "PENDING") group.status = "PENDING";
      if (r.createdAt.toISOString() > group.latestReportAt) {
        group.latestReportAt = r.createdAt.toISOString();
      }
    }

    const allGroups = Array.from(groups.values()).sort((a, b) => b.reportCount - a.reportCount);

    // Manual cursor pagination over the grouped (not raw) list -- cursor
    // is the group's targetKey rather than a DB row id, since groups
    // don't correspond 1:1 with any single table's primary key.
    const startIndex = cursor ? allGroups.findIndex((g) => `${g.targetType}:${g.targetId}` === cursor) + 1 : 0;
    const pageItems = allGroups.slice(startIndex, startIndex + PAGE_SIZE);
    const hasMore = startIndex + PAGE_SIZE < allGroups.length;

    const result: PaginatedResult<AdminReportGroupDTO> = {
      items: pageItems,
      nextCursor: hasMore ? `${pageItems[pageItems.length - 1].targetType}:${pageItems[pageItems.length - 1].targetId}` : null,
      hasMore,
      total: allGroups.length,
    };

    return apiSuccess(result);
  } catch (err) {
    console.error("[ADMIN REPORTS GET ERROR]", err);
    return apiErrors.internal();
  }
}
