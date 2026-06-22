import Link from "next/link";
import { VoteButtons } from "@/components/votes/VoteButtons";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/formatTime";
import { stripHtmlForPreview } from "@/lib/textPreview";
import type { PostDTO } from "@/types";

interface PostCardProps {
  post: PostDTO;
  /** Show a "trending" ribbon treatment for hot/top contexts */
  trending?: boolean;
}

export function PostCard({ post, trending }: PostCardProps) {
  const preview = stripHtmlForPreview(post.content, 200);
  const authorName = post.author.displayName || post.author.username;

  return (
    <article className="group surface-card-interactive flex gap-1 overflow-hidden">
      {/* Vote rail */}
      <div className="flex w-14 shrink-0 flex-col items-center justify-start gap-1 border-r border-brand-100/60 bg-brand-50/40 py-4 dark:border-abyss-700 dark:bg-abyss-800/40">
        <VoteButtons
          targetType="post"
          targetId={post.id}
          initialScore={post.score}
          initialMyVote={post.myVote}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href={`/categories/${post.category.slug}`}>
            <Badge tone="brand" className="tide-underline">
              {post.category.name}
            </Badge>
          </Link>
          {trending && (
            <Badge tone="terracotta">
              <span className="mr-1">🔥</span>Trending
            </Badge>
          )}
          <span aria-hidden="true">·</span>
          <span>{formatRelativeTime(post.createdAt)}</span>
        </div>

        <Link href={`/posts/${post.id}`} className="mt-2 block">
          <h2 className="text-lg font-semibold leading-snug text-coastal-ink transition-colors group-hover:text-coastal-ocean dark:text-slate-100 dark:group-hover:text-brand-300 sm:text-xl">
            {post.title}
          </h2>
        </Link>

        {preview && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {preview}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <Link
            href={`/u/${post.author.username}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-coastal-ocean dark:text-slate-400 dark:hover:text-brand-300"
          >
            <Avatar src={post.author.avatarUrl} name={authorName} size="sm" />
            <span className="font-medium">{authorName}</span>
          </Link>

          <Link
            href={`/posts/${post.id}#comments`}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-brand-50 hover:text-coastal-ocean dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-brand-300"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M4 4h16v12H7l-3 3V4z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {post.commentCount}
          </Link>
        </div>
      </div>
    </article>
  );
}
