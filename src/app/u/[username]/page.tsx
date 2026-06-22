import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { siteConfig } from "@/lib/siteConfig";
import { getReputationTier, getNextTier } from "@/lib/reputation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ReputationBadge } from "@/components/ui/ReputationBadge";
import { Button } from "@/components/ui/Button";
import { ProfileActivity } from "@/components/posts/ProfileActivity";
import { formatFullDate } from "@/lib/formatTime";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s profile`,
    description: `View ${username}'s posts and comments on ${siteConfig.name}.`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const currentUser = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });

  if (!user) notFound();

  const [postScoreAgg, commentScoreAgg] = await Promise.all([
    prisma.post.aggregate({ where: { authorId: user.id }, _sum: { score: true } }),
    prisma.comment.aggregate({ where: { authorId: user.id }, _sum: { score: true } }),
  ]);
  const karma = (postScoreAgg._sum.score ?? 0) + (commentScoreAgg._sum.score ?? 0);

  const tier = getReputationTier(karma);
  const nextTier = getNextTier(karma);
  const progressPct = nextTier
    ? Math.min(100, Math.round(((karma - tier.minKarma) / (nextTier.minKarma - tier.minKarma)) * 100))
    : 100;

  const isSelf = currentUser?.username === user.username;
  const displayName = user.displayName || user.username;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Profile header */}
      <div className="surface-card relative overflow-hidden p-6 sm:p-8">
        <div
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-coastal-ocean to-coastal-lagoon opacity-90"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex items-end justify-between">
            <Avatar
              src={user.avatarUrl}
              name={displayName}
              size="lg"
              className="border-4 border-coastal-shell shadow-md dark:border-abyss-900"
            />
            {isSelf && (
              <Link href="/settings">
                <Button variant="glass" size="sm">
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
              {displayName}
            </h1>
            {(user.role === "ADMIN" || user.role === "MODERATOR") && (
              <Badge tone={user.role === "ADMIN" ? "terracotta" : "brand"}>
                {user.role === "ADMIN" ? "Admin" : "Moderator"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>

          {user.bio && (
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-coastal-ink dark:text-slate-300">
              {user.bio}
            </p>
          )}

          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Joined {formatFullDate(user.createdAt.toISOString())}
          </p>

          {/* Reputation block */}
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-brand-50/50 p-4 dark:bg-abyss-800/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ReputationBadge karma={karma} showKarma />
            </div>
            {nextTier && (
              <div className="flex-1 sm:max-w-xs">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{tier.label}</span>
                  <span>{nextTier.label}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-abyss-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-coastal-ocean to-coastal-lagoon transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <StatBlock label="Posts" value={user._count.posts} />
            <StatBlock label="Comments" value={user._count.comments} />
            <StatBlock label="Karma" value={karma} />
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="mt-8">
        <ProfileActivity username={user.username} />
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-brand-100/60 bg-coastal-shell py-3 dark:border-abyss-700 dark:bg-abyss-900">
      <p className="font-display text-xl font-medium text-coastal-ink dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
