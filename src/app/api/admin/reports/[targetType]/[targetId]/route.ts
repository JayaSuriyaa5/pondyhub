import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { resolveReportSchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { ZodError } from "zod";

interface Params {
  params: Promise<{ targetType: string; targetId: string }>;
}

// PATCH /api/admin/reports/[targetType]/[targetId] — resolve every
// PENDING report against one piece of content with a single action.
//
// `targetType` is "post" or "comment"; `targetId` is that content's id.
// Resolving here means: mark all PENDING reports for this target as
// RESOLVED (with an audit trail of who resolved it and how), plus
// whatever side effect the chosen action implies.
//
// Deliberately reuses the *existing* moderation primitives rather than
// re-implementing them:
//   - DELETE_CONTENT does what DELETE /api/posts/[id] or
//     DELETE /api/comments/[id] already do (hard delete / soft delete
//     respectively) -- same cascade/soft-delete semantics, not a new path.
//   - BAN_USER does what PATCH /api/admin/users/[id] already does
//     (isBanned: true) -- same self-ban and privilege guards apply here
//     too (re-checked below, since this is a different entry point into
//     the same action).
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const { targetType, targetId } = await params;
    if (targetType !== "post" && targetType !== "comment") {
      return apiErrors.notFound("Report target");
    }

    const body = await request.json();
    const { action } = resolveReportSchema.parse(body);

    const pendingReports = await prisma.report.findMany({
      where: targetType === "post" ? { postId: targetId, status: "PENDING" } : { commentId: targetId, status: "PENDING" },
    });

    if (pendingReports.length === 0) {
      return apiErrors.notFound("Pending reports for this content");
    }

    let authorId: string | null = null;

    if (action === "DELETE_CONTENT") {
      if (targetType === "post") {
        const post = await prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true } });
        if (post) {
          authorId = post.authorId;
          // Same hard-delete semantics as DELETE /api/posts/[id] --
          // cascades to comments/votes/reports per the schema's onDelete
          // rules already in place.
          await prisma.post.delete({ where: { id: targetId } });
        }
      } else {
        const comment = await prisma.comment.findUnique({ where: { id: targetId }, select: { authorId: true } });
        if (comment) {
          authorId = comment.authorId;
          // Same soft-delete semantics as DELETE /api/comments/[id] --
          // preserves thread structure for any replies.
          await prisma.comment.update({ where: { id: targetId }, data: { deleted: true, content: "" } });
        }
      }
    } else if (action === "BAN_USER") {
      const content =
        targetType === "post"
          ? await prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true } })
          : await prisma.comment.findUnique({ where: { id: targetId }, select: { authorId: true } });

      if (content) {
        authorId = content.authorId;

        // Re-apply the same guard PATCH /api/admin/users/[id] enforces:
        // nobody can ban themselves, and a moderator (non-admin) cannot
        // ban another moderator/admin -- this endpoint is a second entry
        // point into that action, so it needs the same checks, not a
        // weaker version of them.
        if (authorId === admin.id) {
          return apiErrors.conflict("You can't ban yourself.");
        }
        const targetUser = await prisma.user.findUnique({ where: { id: authorId } });
        if (targetUser) {
          const actorIsAdmin = admin.role === "ADMIN";
          const targetIsPrivileged = targetUser.role === "ADMIN" || targetUser.role === "MODERATOR";
          if (!actorIsAdmin && targetIsPrivileged) {
            return apiErrors.forbidden();
          }
          await prisma.user.update({ where: { id: authorId }, data: { isBanned: true } });
        }
      }
    }
    // DISMISS: no content/user side effect, just resolves the reports below.

    const resolutionAction = action; // "DISMISS" | "DELETE_CONTENT" | "BAN_USER"

    await prisma.report.updateMany({
      where: { id: { in: pendingReports.map((r) => r.id) } },
      data: {
        status: "RESOLVED",
        resolvedById: admin.id,
        resolvedByUsername: admin.username,
        resolvedAt: new Date(),
        resolutionAction,
      },
    });

    return apiSuccess({ resolved: true, action: resolutionAction, reportsResolved: pendingReports.length });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[ADMIN REPORT RESOLVE ERROR]", err);
    return apiErrors.internal();
  }
}
