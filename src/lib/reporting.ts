import { prisma } from "@/lib/prisma";
import type { ReportReason } from "@prisma/client";

// Post auto-hides once it accumulates this many *distinct-reporter*
// reports against it (comments are not auto-hidden in this pass --
// moderators act on them manually via the dashboard's dismiss/delete
// actions, same as today).
const AUTO_HIDE_THRESHOLD = 10;

export type ReportTarget = { postId: string } | { commentId: string };

export class DuplicateReportError extends Error {
  constructor() {
    super("You've already reported this.");
    this.name = "DuplicateReportError";
  }
}

export class ReportTargetNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found.`);
    this.name = "ReportTargetNotFoundError";
  }
}

/**
 * Files a report against a post or comment, then -- if the target is a
 * post that has just crossed the auto-hide threshold -- flips its
 * existing `published` flag to false inside the same transaction, so the
 * report row and the auto-hide decision can never drift apart under
 * concurrent requests (the same atomicity rationale as voting.ts's
 * castPostVote/castCommentVote).
 *
 * Duplicate reports (same reporter, same target) are rejected via the
 * schema's compound unique constraint -- attempting to create one
 * surfaces as a Prisma P2002 error, which we translate to
 * DuplicateReportError here so the route handler can return a clean 409
 * instead of a raw Prisma error.
 */
export async function fileReport(params: {
  reporterId: string;
  reason: ReportReason;
  detail?: string;
  target: ReportTarget;
}): Promise<{ autoHidden: boolean }> {
  const { reporterId, reason, detail, target } = params;

  try {
    return await prisma.$transaction(async (tx) => {
      if ("postId" in target) {
        const post = await tx.post.findUnique({
          where: { id: target.postId },
          select: { id: true, author: { select: { role: true } } },
        });
        if (!post) throw new ReportTargetNotFoundError("Post");

        await tx.report.create({
          data: {
            reporterId,
            reason,
            detail,
            postId: target.postId,
          },
        });

        // Count distinct-reporter PENDING reports against this post. We
        // intentionally count only PENDING reports -- if a moderator has
        // already dismissed earlier reports (status RESOLVED), those
        // shouldn't keep counting toward a fresh auto-hide threshold.
        const pendingCount = await tx.report.count({
          where: { postId: target.postId, status: "PENDING" },
        });

        // Posts authored by an ADMIN are exempt from auto-hide -- they
        // still accumulate reports normally and remain fully visible in
        // the admin dashboard (per the agreed scope, only the automatic
        // `published = false` flip is suppressed; a moderator can still
        // hide/delete an admin's post manually via the existing actions).
        const authorIsAdmin = post.author.role === "ADMIN";

        if (!authorIsAdmin && pendingCount >= AUTO_HIDE_THRESHOLD) {
          const current = await tx.post.findUnique({
            where: { id: target.postId },
            select: { published: true },
          });
          if (current?.published) {
            await tx.post.update({
              where: { id: target.postId },
              data: { published: false },
            });
            return { autoHidden: true };
          }
        }

        return { autoHidden: false };
      }

      // Comment branch -- same shape, no auto-hide.
      const comment = await tx.comment.findUnique({
        where: { id: target.commentId },
        select: { id: true, deleted: true },
      });
      if (!comment || comment.deleted) throw new ReportTargetNotFoundError("Comment");

      await tx.report.create({
        data: {
          reporterId,
          reason,
          detail,
          commentId: target.commentId,
        },
      });

      return { autoHidden: false };
    });
  } catch (err: unknown) {
    if (isPrismaUniqueConstraintError(err)) {
      throw new DuplicateReportError();
    }
    throw err;
  }
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
