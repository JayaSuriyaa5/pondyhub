import { Prisma } from "@prisma/client";
import type { CommentDTO } from "@/types";

export function commentSelect(currentUserId: string | null) {
  return {
    id: true,
    content: true,
    deleted: true,
    postId: true,
    parentId: true,
    authorId: true,
    score: true,
    upvotes: true,
    downvotes: true,
    createdAt: true,
    updatedAt: true,
    author: {
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    },
    votes: currentUserId
      ? { where: { userId: currentUserId }, select: { value: true }, take: 1 }
      : false,
  } satisfies Prisma.CommentSelect;
}

export type CommentWithRelations = Prisma.CommentGetPayload<{
  select: ReturnType<typeof commentSelect>;
}>;

/**
 * Maps a flat list of comments (all comments for a post, regardless of
 * depth) into a nested tree based on parentId, sorted by score within each
 * level. Deleted comments are kept in the tree (so reply chains aren't
 * broken) but their content is masked.
 */
export function buildCommentTree(comments: CommentWithRelations[]): CommentDTO[] {
  const byId = new Map<string, CommentDTO>();
  const roots: CommentDTO[] = [];

  for (const c of comments) {
    byId.set(c.id, {
      id: c.id,
      content: c.deleted ? "[deleted]" : c.content,
      deleted: c.deleted,
      author: c.deleted
        ? { id: c.author.id, username: "[deleted]", displayName: null, avatarUrl: null }
        : c.author,
      postId: c.postId,
      parentId: c.parentId,
      score: c.score,
      upvotes: c.upvotes,
      downvotes: c.downvotes,
      myVote: c.votes && c.votes.length > 0 ? c.votes[0].value : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      replies: [],
    });
  }

  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByScore = (a: CommentDTO, b: CommentDTO) =>
    b.score - a.score || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  function sortTree(nodes: CommentDTO[]) {
    nodes.sort(sortByScore);
    for (const node of nodes) sortTree(node.replies);
  }
  sortTree(roots);

  return roots;
}
