import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin Overview",
};

export default async function AdminOverviewPage() {
  const [userCount, postCount, commentCount, categoryCount, bannedCount, reportableCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.category.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.post.count({ where: { published: false } }),
  ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, username: true, displayName: true, createdAt: true },
  });

  const stats = [
    { label: "Total Users", value: userCount, icon: "👥", href: "/admin/users" },
    { label: "Total Posts", value: postCount, icon: "📝", href: "/admin/posts" },
    { label: "Total Comments", value: commentCount, icon: "💬", href: null },
    { label: "Categories", value: categoryCount, icon: "🗂️", href: "/admin/categories" },
    { label: "Banned Users", value: bannedCount, icon: "🚫", href: "/admin/users" },
    { label: "Unpublished Posts", value: reportableCount, icon: "👁️", href: "/admin/posts" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Dashboard Overview
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        A snapshot of PondyHub's community activity.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const content = (
            <div className="surface-card-interactive flex flex-col gap-1 p-5">
              <span className="text-2xl" aria-hidden="true">
                {stat.icon}
              </span>
              <span className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
                {stat.value}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
            </div>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>

      <div className="surface-card mt-6 p-5">
        <h2 className="font-display text-lg font-medium text-coastal-ink dark:text-white">
          Newest Members
        </h2>
        <div className="mt-3 divide-y divide-brand-50 dark:divide-abyss-800">
          {recentUsers.map((u) => (
            <Link
              key={u.id}
              href={`/u/${u.username}`}
              className="flex items-center justify-between py-2.5 text-sm hover:text-coastal-ocean dark:hover:text-brand-300"
            >
              <span className="font-medium text-coastal-ink dark:text-slate-200">
                {u.displayName || u.username}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(u.createdAt).toLocaleDateString("en-IN")}
              </span>
            </Link>
          ))}
          {recentUsers.length === 0 && (
            <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No users yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
