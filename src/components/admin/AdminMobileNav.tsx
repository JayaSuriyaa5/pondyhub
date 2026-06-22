"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/categories", label: "Categories", icon: "🗂️" },
  { href: "/admin/posts", label: "Posts", icon: "📝" },
];

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="glass scrollbar-thin flex gap-1.5 overflow-x-auto rounded-2xl p-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-gradient-to-r from-coastal-ocean to-coastal-lagoon text-white"
                : "text-slate-600 dark:text-slate-300"
            )}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
