"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { siteConfig } from "@/lib/siteConfig";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/categories", label: "Categories", icon: "🗂️" },
  { href: "/admin/posts", label: "Posts", icon: "📝" },
  { href: "/admin/reports", label: "Reports", icon: "🚩" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-2">
        <Link href="/" className="font-display text-lg font-medium text-coastal-ink dark:text-white">
          {siteConfig.name}
        </Link>
        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Admin Dashboard
        </p>
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-gradient-to-r from-coastal-ocean to-coastal-lagoon text-white shadow-sm"
                : "text-slate-600 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-white/5"
            )}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto px-2 pt-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-coastal-ocean dark:text-slate-500 dark:hover:text-brand-300"
        >
          ← Back to {siteConfig.name}
        </Link>
      </div>
    </nav>
  );
}
