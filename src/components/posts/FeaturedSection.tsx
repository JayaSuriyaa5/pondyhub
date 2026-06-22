import Link from "next/link";
import { featuredPondicherryContent } from "@/lib/featuredContent";

export function FeaturedSection() {
  return (
    <section aria-labelledby="featured-heading">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="featured-heading" className="font-display text-xl font-medium text-coastal-ink dark:text-white">
          Featured in Pondicherry
        </h2>
        <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Curated by PondyHub
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featuredPondicherryContent.map((item, i) => (
          <Link
            key={item.id}
            href={item.href}
            className="surface-card-interactive group relative flex flex-col gap-2 overflow-hidden p-5 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-coastal-lagoon/15 to-coastal-terracotta/10 transition-transform duration-300 group-hover:scale-125"
              aria-hidden="true"
            />
            <span className="relative text-2xl" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="relative inline-flex w-fit items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-coastal-oceanDark dark:bg-abyss-800 dark:text-brand-300">
              {item.tag}
            </span>
            <h3 className="relative font-display text-base font-medium leading-snug text-coastal-ink transition-colors group-hover:text-coastal-ocean dark:text-slate-100 dark:group-hover:text-brand-300">
              {item.title}
            </h3>
            <p className="relative text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
