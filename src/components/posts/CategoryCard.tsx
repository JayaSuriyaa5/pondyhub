import Link from "next/link";
import { getCategoryVisual } from "@/lib/categoryVisuals";
import type { CategoryDTO } from "@/types";

export function CategoryCard({ category, index = 0 }: { category: CategoryDTO; index?: number }) {
  const visual = getCategoryVisual(category.slug);

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="surface-card-interactive group flex flex-col gap-3 p-5 animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${visual.gradient} text-xl text-white shadow-sm transition-transform duration-200 group-hover:scale-110`}
      >
        <span aria-hidden="true">{visual.emoji}</span>
      </div>
      <div>
        <h3 className="font-semibold text-coastal-ink transition-colors group-hover:text-coastal-ocean dark:text-slate-100 dark:group-hover:text-brand-300">
          {category.name}
        </h3>
        {category.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {category.description}
          </p>
        )}
      </div>
      <span className="mt-auto text-xs font-medium text-slate-400 dark:text-slate-500">
        {category.postCount ?? 0} {category.postCount === 1 ? "post" : "posts"}
      </span>
    </Link>
  );
}
