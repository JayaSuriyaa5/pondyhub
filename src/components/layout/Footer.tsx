import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-100/60 bg-coastal-shell dark:border-abyss-700 dark:bg-abyss-950">
      <div className="tide-divider opacity-40" />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <span className="font-display text-xl font-medium text-coastal-ink dark:text-white">
              {siteConfig.name}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {siteConfig.tagline}. A place for Puducherry to talk, share, and connect.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-coastal-ink/70 dark:text-slate-300">
              Explore
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/" className="tide-underline hover:text-coastal-ocean dark:hover:text-brand-300">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/categories/local-news" className="tide-underline hover:text-coastal-ocean dark:hover:text-brand-300">
                  Local News
                </Link>
              </li>
              <li>
                <Link href="/categories/jobs-careers" className="tide-underline hover:text-coastal-ocean dark:hover:text-brand-300">
                  Jobs &amp; Careers
                </Link>
              </li>
              <li>
                <Link href="/categories/buy-sell" className="tide-underline hover:text-coastal-ocean dark:hover:text-brand-300">
                  Buy &amp; Sell
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-coastal-ink/70 dark:text-slate-300">
              Community
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/register" className="tide-underline hover:text-coastal-ocean dark:hover:text-brand-300">
                  Join {siteConfig.name}
                </Link>
              </li>
              <li>
                <Link href="/categories/help-support" className="tide-underline hover:text-coastal-ocean dark:hover:text-brand-300">
                  Help &amp; Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-brand-100/60 pt-6 text-xs text-slate-500 dark:border-abyss-700 dark:text-slate-400 sm:flex-row">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <p className="font-medium">{siteConfig.parentCompany.poweredByLabel}</p>
        </div>
      </div>
    </footer>
  );
}
