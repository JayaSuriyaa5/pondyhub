import { prisma } from "@/lib/prisma";
import { getIO, userRoom, postRoom } from "@/lib/socket/server";
import type { NotificationType } from "@prisma/client";
import type { CommentDTO, NotificationPayload } from "@/types";

export type { NotificationPayload };

/**
 * Persists a notification row and pushes it over the socket to the
 * recipient's private room, if they're currently connected. Always writes
 * to the database first -- the socket push is a best-effort UX nicety on
 * top of that, not the source of truth, so a recipient who's offline at
 * the moment still sees it the next time they load /notifications.
 *
 * No-ops (skips entirely) if the recipient is the same as the actor, so
 * e.g. replying to your own comment doesn't notify yourself.
 */
export async function createAndEmitNotification(params: {
  recipientId: string;
  actorId: string;
  actorUsername: string;
  type: NotificationType;
  message: string;
  postId?: string;
  commentId?: string;
}): Promise<void> {
  if (params.recipientId === params.actorId) return;

  const notification = await prisma.notification.create({
    data: {
      recipientId: params.recipientId,
      actorId: params.actorId,
      actorUsername: params.actorUsername,
      type: params.type,
      message: params.message,
      postId: params.postId ?? null,
      commentId: params.commentId ?? null,
    },
  });

  const payload: NotificationPayload = {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    actorUsername: notification.actorUsername,
    postId: notification.postId,
    commentId: notification.commentId,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };

  const io = getIO();
  if (io) {
    io.to(userRoom(params.recipientId)).emit("notification:new", payload);
  }
}

/**
 * Broadcasts a newly created comment to everyone currently subscribed to
 * that post's room (i.e. anyone with the post page open). This is purely
 * a live-UI push -- the comment is already persisted by the caller before
 * this runs, so a client that misses the socket event (e.g. reconnecting)
 * still sees it on next fetch via the normal GET /api/comments call.
 */
export function emitNewComment(postId: string, comment: CommentDTO): void {
  const io = getIO();
  if (io) {
    io.to(postRoom(postId)).emit("comment:new", comment);
  }
}
