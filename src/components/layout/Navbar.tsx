"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/context/NotificationContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/siteConfig";

export function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/?q=${encodeURIComponent(search.trim())}`);
      setMobileOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 glass border-b-0">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-coastal-ocean to-coastal-lagoon text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            {/* Simple wave glyph, evokes "coastal" without needing an image asset */}
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M2 9c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M2 15c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </span>
          <span className="font-display text-xl font-medium text-coastal-ink dark:text-white">
            {siteConfig.name}
          </span>
        </Link>

        {/* Search (desktop) */}
        <form onSubmit={handleSearch} className="hidden flex-1 max-w-md md:block">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PondyHub..."
              className="w-full rounded-xl border border-white/40 bg-white/70 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-coastal-ocean dark:border-white/10 dark:bg-abyss-800/60 dark:text-slate-100"
            />
          </div>
        </form>

        {/* Right side actions (desktop) */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <Link href="/posts/new">
                <Button size="sm">New Post</Button>
              </Link>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full"
                  aria-label="Open user menu"
                >
                  <Avatar src={user.avatarUrl} name={user.displayName || user.username} size="sm" />
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 animate-scale-in rounded-xl glass-strong py-1"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <Link
                      href={`/u/${user.username}`}
                      className="block px-4 py-2 text-sm hover:bg-brand-50 dark:hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    {(user.role === "ADMIN" || user.role === "MODERATOR") && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm hover:bg-brand-50 dark:hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-brand-50 dark:text-red-400 dark:hover:bg-white/5"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="tide-divider opacity-60" />

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t border-white/40 dark:border-white/10 px-4 py-4 glass md:hidden">
          <form onSubmit={handleSearch} className="mb-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-abyss-800/60 dark:text-slate-100"
            />
          </form>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
          {user ? (
            <div className="flex flex-col gap-2">
              <Link href="/notifications" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-between">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coastal-terracotta px-1.5 text-xs font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/posts/new" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">New Post</Button>
              </Link>
              <Link href={`/u/${user.username}`} onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full">
                  Profile
                </Button>
              </Link>
              {(user.role === "ADMIN" || user.role === "MODERATOR") && (
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              <Button variant="danger" className="w-full" onClick={() => logout()}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
