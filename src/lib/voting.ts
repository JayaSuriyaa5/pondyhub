import { prisma } from "@/lib/prisma";
import type { VoteValue } from "@prisma/client";

type VoteAction = "UP" | "DOWN" | "NONE";

interface VoteResult {
  score: number;
  upvotes: number;
  downvotes: number;
  myVote: VoteValue | null;
}

/**
 * Casts, switches, or retracts a user's vote on a post, and returns the
 * updated aggregate counts. All writes happen inside a single transaction
 * so the vote row and the denormalized counters on Post never drift apart,
 * even under concurrent requests.
 */
export async function castPostVote(
  userId: string,
  postId: string,
  action: VoteAction
): Promise<VoteResult> {
  return prisma.$transaction(async (tx) => {
    const existingVote = await tx.postVote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (action === "NONE") {
      if (existingVote) {
        await tx.postVote.delete({ where: { id: existingVote.id } });
        await applyPostDelta(tx, postId, existingVote.value, null);
      }
    } else if (!existingVote) {
      await tx.postVote.create({ data: { userId, postId, value: action } });
      await applyPostDelta(tx, postId, null, action);
    } else if (existingVote.value !== action) {
      await tx.postVote.update({ where: { id: existingVote.id }, data: { value: action } });
      await applyPostDelta(tx, postId, existingVote.value, action);
    }
    // else: same vote cast again -> no-op (idempotent)

    const post = await tx.post.findUniqueOrThrow({
      where: { id: postId },
      select: { score: true, upvotes: true, downvotes: true },
    });

    const finalVote =
      action === "NONE" ? null : await tx.postVote.findUnique({ where: { userId_postId: { userId, postId } } });

    return {
      score: post.score,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      myVote: finalVote ? finalVote.value : null,
    };
  });
}

export async function castCommentVote(
  userId: string,
  commentId: string,
  action: VoteAction
): Promise<VoteResult> {
  return prisma.$transaction(async (tx) => {
    const existingVote = await tx.commentVote.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (action === "NONE") {
      if (existingVote) {
        await tx.commentVote.delete({ where: { id: existingVote.id } });
        await applyCommentDelta(tx, commentId, existingVote.value, null);
      }
    } else if (!existingVote) {
      await tx.commentVote.create({ data: { userId, commentId, value: action } });
      await applyCommentDelta(tx, commentId, null, action);
    } else if (existingVote.value !== action) {
      await tx.commentVote.update({ where: { id: existingVote.id }, data: { value: action } });
      await applyCommentDelta(tx, commentId, existingVote.value, action);
    }

    const comment = await tx.comment.findUniqueOrThrow({
      where: { id: commentId },
      select: { score: true, upvotes: true, downvotes: true },
    });

    const finalVote =
      action === "NONE"
        ? null
        : await tx.commentVote.findUnique({ where: { userId_commentId: { userId, commentId } } });

    return {
      score: comment.score,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      myVote: finalVote ? finalVote.value : null,
    };
  });
}

// ----------------------------------------------------------------------------
// Internal delta helpers
//
// `from` is the vote's previous value (or null if there wasn't one).
// `to` is the vote's new value (or null if it was retracted).
// We compute the net change to upvotes/downvotes/score in one update rather
// than two separate +1/-1 operations, to keep it atomic within the tx.
// ----------------------------------------------------------------------------

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function applyPostDelta(
  tx: Tx,
  postId: string,
  from: VoteValue | null,
  to: VoteValue | null
) {
  const { upvoteDelta, downvoteDelta } = computeDeltas(from, to);
  await tx.post.update({
    where: { id: postId },
    data: {
      upvotes: { increment: upvoteDelta },
      downvotes: { increment: downvoteDelta },
      score: { increment: upvoteDelta - downvoteDelta },
    },
  });
}

async function applyCommentDelta(
  tx: Tx,
  commentId: string,
  from: VoteValue | null,
  to: VoteValue | null
) {
  const { upvoteDelta, downvoteDelta } = computeDeltas(from, to);
  await tx.comment.update({
    where: { id: commentId },
    data: {
      upvotes: { increment: upvoteDelta },
      downvotes: { increment: downvoteDelta },
      score: { increment: upvoteDelta - downvoteDelta },
    },
  });
}

function computeDeltas(from: VoteValue | null, to: VoteValue | null) {
  let upvoteDelta = 0;
  let downvoteDelta = 0;

  if (from === "UP") upvoteDelta -= 1;
  if (from === "DOWN") downvoteDelta -= 1;
  if (to === "UP") upvoteDelta += 1;
  if (to === "DOWN") downvoteDelta += 1;

  return { upvoteDelta, downvoteDelta };
}
