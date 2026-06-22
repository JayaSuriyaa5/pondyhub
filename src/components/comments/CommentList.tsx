"use client";

import { useEffect, useState } from "react";
import { CommentItem } from "@/components/comments/CommentItem";
import { CommentForm } from "@/components/comments/CommentForm";
import { Spinner } from "@/components/ui/Spinner";
import { useSocket } from "@/hooks/useSocket";
import type { CommentDTO } from "@/types";

interface CommentListProps {
  postId: string;
  initialComments: CommentDTO[];
  initialTotal: number;
}

function insertReply(comments: CommentDTO[], parentId: string, reply: CommentDTO): CommentDTO[] {
  return comments.map((c) => {
    if (c.id === parentId) {
      return { ...c, replies: [reply, ...c.replies] };
    }
    if (c.replies.length > 0) {
      return { ...c, replies: insertReply(c.replies, parentId, reply) };
    }
    return c;
  });
}

function updateComment(comments: CommentDTO[], commentId: string, patch: Partial<CommentDTO>): CommentDTO[] {
  return comments.map((c) => {
    if (c.id === commentId) {
      return { ...c, ...patch };
    }
    if (c.replies.length > 0) {
      return { ...c, replies: updateComment(c.replies, commentId, patch) };
    }
    return c;
  });
}

function markDeleted(comments: CommentDTO[], commentId: string): CommentDTO[] {
  return updateComment(comments, commentId, {
    deleted: true,
    content: "[deleted]",
    author: { id: "", username: "[deleted]", displayName: null, avatarUrl: null },
  });
}

/** True if a comment with this ID already exists anywhere in the tree. */
function treeContains(comments: CommentDTO[], commentId: string): boolean {
  for (const c of comments) {
    if (c.id === commentId) return true;
    if (c.replies.length > 0 && treeContains(c.replies, commentId)) return true;
  }
  return false;
}

export function CommentList({ postId, initialComments, initialTotal }: CommentListProps) {
  const [comments, setComments] = useState<CommentDTO[]>(initialComments);
  const [total, setTotal] = useState(initialTotal);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    let cancelled = false;
    setIsRefreshing(true);
    fetch(`/api/comments?postId=${postId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: { comments: CommentDTO[]; total: number } }) => {
        if (!cancelled && json.success && json.data) {
          setComments(json.data.comments);
          setTotal(json.data.total);
        }
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Live comments: subscribe to this post's room while mounted, and merge
  // in any comment broadcast by another viewer. We dedupe against the
  // current tree because the comment we just posted ourselves is already
  // inserted optimistically via handleTopLevelSubmitted/handleReplyPosted
  // -- without the check, our own comment would briefly double up when
  // the server's broadcast echoes back to us a moment later.
  useEffect(() => {
    if (!socket) return;

    socket.emit("post:subscribe", postId);

    function handleNewComment(incoming: CommentDTO) {
      setComments((prev) => {
        if (treeContains(prev, incoming.id)) return prev;
        if (incoming.parentId) {
          if (!treeContains(prev, incoming.parentId)) return prev; // parent not loaded; skip
          return insertReply(prev, incoming.parentId, incoming);
        }
        return [incoming, ...prev];
      });
      setTotal((t) => t + 1);
    }

    socket.on("comment:new", handleNewComment);

    return () => {
      socket.emit("post:unsubscribe", postId);
      socket.off("comment:new", handleNewComment);
    };
  }, [socket, postId]);

  function handleTopLevelSubmitted(comment: CommentDTO) {
    setComments((prev) => {
      if (treeContains(prev, comment.id)) return prev;
      return [comment, ...prev];
    });
    setTotal((t) => t + 1);
  }

  function handleReplyPosted(parentId: string, reply: CommentDTO) {
    setComments((prev) => {
      if (treeContains(prev, reply.id)) return prev;
      return insertReply(prev, parentId, reply);
    });
    setTotal((t) => t + 1);
  }

  function handleCommentUpdated(commentId: string, patch: Partial<CommentDTO>) {
    setComments((prev) => updateComment(prev, commentId, patch));
  }

  function handleCommentDeleted(commentId: string) {
    setComments((prev) => markDeleted(prev, commentId));
  }

  return (
    <section id="comments" className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-display text-xl font-medium text-coastal-ink dark:text-white">
          {total} {total === 1 ? "Comment" : "Comments"}
        </h2>
        {isRefreshing && <Spinner className="h-4 w-4" />}
      </div>

      <div className="surface-card p-4 sm:p-5">
        <CommentForm postId={postId} onSubmitted={handleTopLevelSubmitted} />

        {comments.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No comments yet. Start the conversation.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-brand-50 dark:divide-abyss-800">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplyPosted={handleReplyPosted}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
