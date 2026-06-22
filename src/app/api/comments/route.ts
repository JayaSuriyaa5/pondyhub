import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/session";
import { createCommentSchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { commentSelect, buildCommentTree } from "@/lib/commentSerializer";
import { sanitizeHtml } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rateLimit";
import { createAndEmitNotification, emitNewComment } from "@/lib/socket/emit";
import { ZodError } from "zod";

// GET /api/comments?postId=xxx — returns the full nested comment tree for a
// post. For an MVP, loading the whole tree at once is simplest and fine for
// typical comment volumes; very large threads (1000s of comments) would
// benefit from a depth-limited / paginated approach later.
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");
    if (!postId) {
      return apiErrors.notFound("Post");
    }

    const currentUser = await getCurrentUser();

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return apiErrors.notFound("Post");

    const comments = await prisma.comment.findMany({
      where: { postId },
      select: commentSelect(currentUser?.id ?? null),
    });

    const tree = buildCommentTree(comments);

    return apiSuccess({ comments: tree, total: comments.length });
  } catch (err) {
    console.error("[COMMENTS GET ERROR]", err);
    return apiErrors.internal();
  }
}

// POST /api/comments — create a top-level comment or a reply (parentId set).
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const limitResult = rateLimit(`create-comment:${user.id}`, 30, 10 * 60 * 1000);
    if (!limitResult.allowed) return apiErrors.rateLimited();

    const body = await request.json();
    const input = createCommentSchema.parse(body);

    const post = await prisma.post.findUnique({
      where: { id: input.postId },
      select: { id: true, published: true, authorId: true, title: true },
    });
    if (!post) return apiErrors.notFound("Post");

    const isOwner = post.authorId === user.id;
    const isPrivileged = user.role === "ADMIN" || user.role === "MODERATOR";
    if (!post.published && !isOwner && !isPrivileged) {
      return apiErrors.notFound("Post");
    }

    let parentComment: { id: string; authorId: string; postId: string } | null = null;
    if (input.parentId) {
      parentComment = await prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { id: true, authorId: true, postId: true },
      });
      if (!parentComment) return apiErrors.notFound("Parent comment");
      if (parentComment.postId !== input.postId) {
        return apiErrors.conflict("Parent comment does not belong to this post.");
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: sanitizeHtml(input.content),
        postId: input.postId,
        parentId: input.parentId ?? null,
        authorId: user.id,
      },
      select: commentSelect(user.id),
    });

    const tree = buildCommentTree([comment]);
    const commentDTO = tree[0];

    // Broadcast to anyone currently viewing this post for live comment
    // insertion (best-effort UX; the comment is already durably saved
    // above regardless of whether anyone is listening).
    emitNewComment(input.postId, commentDTO);

    // Notify whoever should know about this comment. A reply to another
    // comment notifies that comment's author ("X replied to your
    // comment"); a top-level comment notifies the post's author instead
    // ("X commented on your post"). createAndEmitNotification() already
    // no-ops if the recipient is the same as the actor (e.g. replying to
    // your own comment, or commenting on your own post).
    if (parentComment) {
      await createAndEmitNotification({
        recipientId: parentComment.authorId,
        actorId: user.id,
        actorUsername: user.username,
        type: "COMMENT_REPLY",
        message: `replied to your comment`,
        postId: input.postId,
        commentId: comment.id,
      });
    } else {
      await createAndEmitNotification({
        recipientId: post.authorId,
        actorId: user.id,
        actorUsername: user.username,
        type: "POST_COMMENT",
        message: `commented on your post "${post.title}"`,
        postId: input.postId,
        commentId: comment.id,
      });
    }

    return apiSuccess({ comment: commentDTO }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[COMMENTS POST ERROR]", err);
    return apiErrors.internal();
  }
}
