"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import type { VoteValue } from "@prisma/client";

interface VoteButtonsProps {
  targetType: "post" | "comment";
  targetId: string;
  initialScore: number;
  initialMyVote: VoteValue | null;
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md";
}

interface VoteApiResult {
  score: number;
  upvotes: number;
  downvotes: number;
  myVote: VoteValue | null;
}

export function VoteButtons({
  targetType,
  targetId,
  initialScore,
  initialMyVote,
  orientation = "vertical",
  size = "md",
}: VoteButtonsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [myVote, setMyVote] = useState<VoteValue | null>(initialMyVote);
  const [isPending, startTransition] = useTransition();
  const [justVoted, setJustVoted] = useState<"UP" | "DOWN" | null>(null);

  async function castVote(action: "UP" | "DOWN") {
    if (!user) {
      router.push("/login");
      return;
    }

    const nextValue: "UP" | "DOWN" | "NONE" = myVote === action ? "NONE" : action;

    // Optimistic update — compute the new score immediately so voting
    // feels instant, then reconcile with the server response.
    const previousScore = score;
    const previousVote = myVote;

    let delta = 0;
    if (previousVote === "UP") delta -= 1;
    if (previousVote === "DOWN") delta += 1;
    if (nextValue === "UP") delta += 1;
    if (nextValue === "DOWN") delta -= 1;

    setScore(previousScore + delta);
    setMyVote(nextValue === "NONE" ? null : nextValue);
    if (nextValue !== "NONE") {
      setJustVoted(nextValue);
      setTimeout(() => setJustVoted(null), 300);
    }

    startTransition(async () => {
      try {
        const endpoint =
          targetType === "post" ? `/api/posts/${targetId}/vote` : `/api/comments/${targetId}/vote`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: nextValue }),
        });
        const json: { success: boolean; data?: VoteApiResult } = await res.json();

        if (!json.success || !json.data) {
          // Roll back on failure
          setScore(previousScore);
          setMyVote(previousVote);
          return;
        }

        setScore(json.data.score);
        setMyVote(json.data.myVote);
      } catch {
        setScore(previousScore);
        setMyVote(previousVote);
      }
    });
  }

  const isVertical = orientation === "vertical";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={clsx(
        "flex items-center select-none",
        isVertical ? "flex-col gap-0.5" : "flex-row gap-1.5"
      )}
    >
      <button
        type="button"
        onClick={() => castVote("UP")}
        disabled={isPending}
        aria-label="Upvote"
        aria-pressed={myVote === "UP"}
        className={clsx(
          "flex items-center justify-center rounded-lg p-1.5 transition-all duration-150",
          myVote === "UP"
            ? "bg-upvote/15 text-upvote"
            : "text-slate-400 hover:bg-upvote/10 hover:text-upvote dark:text-slate-500",
          justVoted === "UP" && "scale-125"
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className={iconSize} aria-hidden="true">
          <path
            d="M12 5l7 7M12 5l-7 7M12 5v14"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <span
        className={clsx(
          "tabular-nums font-semibold transition-colors",
          size === "sm" ? "text-sm" : "text-base",
          myVote === "UP" && "text-upvote",
          myVote === "DOWN" && "text-downvote",
          !myVote && "text-coastal-ink dark:text-slate-200"
        )}
      >
        {formatScore(score)}
      </span>

      <button
        type="button"
        onClick={() => castVote("DOWN")}
        disabled={isPending}
        aria-label="Downvote"
        aria-pressed={myVote === "DOWN"}
        className={clsx(
          "flex items-center justify-center rounded-lg p-1.5 transition-all duration-150",
          myVote === "DOWN"
            ? "bg-downvote/15 text-downvote"
            : "text-slate-400 hover:bg-downvote/10 hover:text-downvote dark:text-slate-500",
          justVoted === "DOWN" && "scale-125"
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className={iconSize} aria-hidden="true">
          <path
            d="M12 19l7-7M12 19l-7-7M12 19V5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function formatScore(score: number): string {
  if (Math.abs(score) >= 1000) {
    return `${(score / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(score);
}
