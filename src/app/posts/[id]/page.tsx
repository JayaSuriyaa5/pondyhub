import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { postSelect, toPostDTO } from "@/lib/postSerializer";
import { commentSelect, buildCommentTree } from "@/lib/commentSerializer";
import { stripHtmlForPreview } from "@/lib/textPreview";
import { VoteButtons } from "@/components/votes/VoteButtons";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CommentList } from "@/components/comments/CommentList";
import { formatRelativeTime, formatFullDate } from "@/lib/formatTime";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true, content: true },
  });
  if (!post) return { title: "Post not found" };

  return {
    title: post.title,
    description: stripHtmlForPreview(post.content, 160),
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const postRecord = await prisma.post.findUnique({
    where: { id },
    select: postSelect(currentUser?.id ?? null),
  });

  if (!postRecord) notFound();

  // A post hidden by moderation (published: false) should only remain
  // visible to its own author or to moderators/admins — anyone else
  // hitting this URL directly gets the same 404 as a nonexistent post,
  // so "hide" actually hides it rather than just delisting it from feeds.
  const viewerIsOwner = currentUser?.id === postRecord.authorId;
  const viewerCanModerate = currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";
  if (!postRecord.published && !viewerIsOwner && !viewerCanModerate) {
    notFound();
  }

  const post = toPostDTO(postRecord);

  const commentRecords = await prisma.comment.findMany({
    where: { postId: id },
    select: commentSelect(currentUser?.id ?? null),
  });
  const commentTree = buildCommentTree(commentRecords);

  const isOwner = currentUser?.username === post.author.username;
  const canModerate = currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";
  const authorName = post.author.displayName || post.author.username;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <article className="surface-card flex gap-1 overflow-hidden">
        <div className="flex w-16 shrink-0 flex-col items-center justify-start gap-1 border-r border-brand-100/60 bg-brand-50/40 py-5 dark:border-abyss-700 dark:bg-abyss-800/40">
          <VoteButtons
            targetType="post"
            targetId={post.id}
            initialScore={post.score}
            initialMyVote={post.myVote}
          />
        </div>

        <div className="flex-1 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link href={`/categories/${post.category.slug}`}>
              <Badge tone="brand">{post.category.name}</Badge>
            </Link>
            {!post.published && (
              <Badge tone="warning">Hidden by moderators · only visible to you</Badge>
            )}
            <span aria-hidden="true">·</span>
            <span title={formatFullDate(post.createdAt)}>{formatRelativeTime(post.createdAt)}</span>
          </div>

          <h1 className="mt-3 font-display text-2xl font-medium leading-tight text-coastal-ink dark:text-white sm:text-3xl">
            {post.title}
          </h1>

          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/u/${post.author.username}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-coastal-ocean dark:text-slate-400 dark:hover:text-brand-300"
            >
              <Avatar src={post.author.avatarUrl} name={authorName} size="sm" />
              <span className="font-medium">{authorName}</span>
            </Link>

            {(isOwner || canModerate) && (
              <div className="flex gap-2">
                {isOwner && (
                  <Link href={`/posts/${post.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div
            className="prose-content mt-5 text-base"
            // Content is sanitized server-side via isomorphic-dompurify
            // before it's ever stored (see src/lib/sanitize.ts and the
            // post create/update API routes) — this is the one place we
            // render that trusted, pre-sanitized HTML.
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>

      <CommentList postId={post.id} initialComments={commentTree} initialTotal={commentRecords.length} />
    </div>
  );
}
