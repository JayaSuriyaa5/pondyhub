"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { VoteButtons } from "@/components/votes/VoteButtons";
import { CommentForm } from "@/components/comments/CommentForm";
import { formatRelativeTime } from "@/lib/formatTime";
import type { CommentDTO } from "@/types";

interface CommentItemProps {
  comment: CommentDTO;
  postId: string;
  depth?: number;
  onReplyPosted: (parentId: string, reply: CommentDTO) => void;
  onCommentUpdated: (commentId: string, updated: Partial<CommentDTO>) => void;
  onCommentDeleted: (commentId: string) => void;
}

// Cap visual indentation so very deep threads (10+ levels) don't squeeze
// content into an unusably narrow column on smaller screens. Replies
// beyond this depth still nest logically, just without further indent.
const MAX_VISUAL_DEPTH = 6;

export function CommentItem({
  comment,
  postId,
  depth = 0,
  onReplyPosted,
  onCommentUpdated,
  onCommentDeleted,
}: CommentItemProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isOwner = user?.username === comment.author.username;
  const canModerate = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const authorName = comment.author.displayName || comment.author.username;

  async function handleSaveEdit() {
    if (!editContent.trim()) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      const json: { success: boolean; data?: { comment: CommentDTO }; error?: { message: string } } =
        await res.json();

      if (!json.success || !json.data) {
        setEditError(json.error?.message || "Couldn't save your edit.");
        return;
      }

      onCommentUpdated(comment.id, { content: json.data.comment.content });
      setIsEditing(false);
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
      const json: { success: boolean } = await res.json();
      if (json.success) {
        onCommentDeleted(comment.id);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);

  return (
    <div className={clsx(visualDepth > 0 && "border-l-2 border-brand-100 pl-4 dark:border-abyss-700")}>
      <div className="flex gap-3 py-3">
        {!comment.deleted ? (
          <Link href={`/u/${comment.author.username}`} className="shrink-0">
            <Avatar src={comment.author.avatarUrl} name={authorName} size="sm" />
          </Link>
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200 dark:bg-abyss-700" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5 text-sm">
            {!comment.deleted ? (
              <Link
                href={`/u/${comment.author.username}`}
                className="font-medium text-coastal-ink hover:text-coastal-ocean dark:text-slate-200 dark:hover:text-brand-300"
              >
                {authorName}
              </Link>
            ) : (
              <span className="font-medium italic text-slate-400 dark:text-slate-500">[deleted]</span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-500">
              · {formatRelativeTime(comment.createdAt)}
              {comment.createdAt !== comment.updatedAt && !comment.deleted && " (edited)"}
            </span>
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="ml-1 text-xs text-slate-400 hover:text-coastal-ocean dark:text-slate-500 dark:hover:text-brand-300"
            >
              [{collapsed ? "+" : "−"}]
            </button>
          </div>

          {!collapsed && (
            <>
              {isEditing ? (
                <div className="mt-1.5">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-coastal-shell px-3 py-2 text-sm text-coastal-ink focus:outline-none focus:ring-2 focus:ring-coastal-ocean dark:border-abyss-700 dark:bg-abyss-900 dark:text-slate-100"
                  />
                  {editError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editError}</p>}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" isLoading={isSavingEdit} onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={clsx(
                    "mt-0.5 whitespace-pre-wrap text-sm leading-relaxed",
                    comment.deleted
                      ? "italic text-slate-400 dark:text-slate-500"
                      : "text-coastal-ink dark:text-slate-200"
                  )}
                >
                  {comment.content}
                </p>
              )}

              {!comment.deleted && !isEditing && (
                <div className="mt-1.5 flex items-center gap-3">
                  <VoteButtons
                    targetType="comment"
                    targetId={comment.id}
                    initialScore={comment.score}
                    initialMyVote={comment.myVote}
                    orientation="horizontal"
                    size="sm"
                  />
                  <button
                    onClick={() => setIsReplying((v) => !v)}
                    className="text-xs font-medium text-slate-500 hover:text-coastal-ocean dark:text-slate-400 dark:hover:text-brand-300"
                  >
                    Reply
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-medium text-slate-500 hover:text-coastal-ocean dark:text-slate-400 dark:hover:text-brand-300"
                    >
                      Edit
                    </button>
                  )}
                  {(isOwner || canModerate) && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}

              {isReplying && (
                <div className="mt-3">
                  <CommentForm
                    postId={postId}
                    parentId={comment.id}
                    compact
                    autoFocus
                    placeholder={`Reply to ${authorName}...`}
                    onCancel={() => setIsReplying(false)}
                    onSubmitted={(reply) => {
                      onReplyPosted(comment.id, reply);
                      setIsReplying(false);
                    }}
                  />
                </div>
              )}

              {comment.replies.length > 0 && (
                <div className="mt-1">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      depth={depth + 1}
                      onReplyPosted={onReplyPosted}
                      onCommentUpdated={onCommentUpdated}
                      onCommentDeleted={onCommentDeleted}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
