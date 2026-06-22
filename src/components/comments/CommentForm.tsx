"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import type { CommentDTO } from "@/types";

interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  onSubmitted: (comment: CommentDTO) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  compact?: boolean;
}

export function CommentForm({
  postId,
  parentId = null,
  onSubmitted,
  onCancel,
  autoFocus,
  placeholder = "Add to the discussion...",
  compact = false,
}: CommentFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, postId, parentId }),
      });
      const json: { success: boolean; data?: { comment: CommentDTO }; error?: { message: string } } =
        await res.json();

      if (!json.success || !json.data) {
        setError(json.error?.message || "Couldn't post your comment. Please try again.");
        return;
      }

      onSubmitted(json.data.comment);
      setContent("");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="surface-card flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="text-slate-600 dark:text-slate-400">Log in to join the discussion.</span>
        <Button size="sm" variant="outline" onClick={() => router.push("/login")}>
          Log in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      {!compact && (
        <Avatar src={user.avatarUrl} name={user.displayName || user.username} size="sm" className="mt-1 shrink-0" />
      )}
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={compact ? 2 : 3}
          maxLength={10000}
          className="w-full resize-none rounded-xl border border-slate-200 bg-coastal-shell px-3 py-2 text-sm text-coastal-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-coastal-ocean dark:border-abyss-700 dark:bg-abyss-900 dark:text-slate-100"
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!content.trim()}>
            {parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
