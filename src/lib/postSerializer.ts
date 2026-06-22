import { Prisma } from "@prisma/client";
import type { PostDTO } from "@/types";

export function postSelect(currentUserId: string | null) {
  return {
    id: true,
    title: true,
    content: true,
    published: true,
    score: true,
    upvotes: true,
    downvotes: true,
    createdAt: true,
    updatedAt: true,
    authorId: true,
    categoryId: true,
    author: {
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    },
    category: { select: { id: true, name: true, slug: true } },
    _count: { select: { comments: true } },
    votes: currentUserId
      ? { where: { userId: currentUserId }, select: { value: true }, take: 1 }
      : false,
  } satisfies Prisma.PostSelect;
}

export type PostWithRelations = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

export function toPostDTO(post: PostWithRelations): PostDTO {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    published: post.published,
    author: post.author,
    category: post.category,
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    commentCount: post._count.comments,
    myVote: post.votes && post.votes.length > 0 ? post.votes[0].value : null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
