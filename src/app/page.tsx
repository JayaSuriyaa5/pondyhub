import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/siteConfig";
import { PostList } from "@/components/posts/PostList";
import { TrendingSidebar } from "@/components/posts/TrendingSidebar";
import { FeaturedSection } from "@/components/posts/FeaturedSection";
import { CategoryCard } from "@/components/posts/CategoryCard";
import type { CategoryDTO } from "@/types";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

interface HomePageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  const categoryDTOs: CategoryDTO[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    postCount: c._count.posts,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      {!q && (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl py-14 sm:py-20">
            <div
              className="absolute inset-0 bg-gradient-to-br from-coastal-ocean via-coastal-lagoon to-coastal-ocean opacity-95"
              aria-hidden="true"
            />
            <div
              className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <div
              className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-coastal-terracotta/20 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative mx-auto max-w-2xl px-6 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <span aria-hidden="true">🌊</span> Puducherry&apos;s community, online
              </span>
              <h1 className="mt-5 font-display text-display-sm font-medium text-white sm:text-display-md">
                Talk Pondicherry. <br className="hidden sm:block" />
                With your neighbors.
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-balance text-sm leading-relaxed text-white/85 sm:text-base">
                {siteConfig.name} is where Puducherry asks questions, shares news, finds jobs, and
                discovers the city — one discussion at a time.
              </p>
            </div>
          </section>

          {/* Featured Pondicherry content */}
          <div className="mt-10">
            <FeaturedSection />
          </div>

          {/* Category grid */}
          <section className="mt-10" aria-labelledby="categories-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="categories-heading" className="font-display text-xl font-medium text-coastal-ink dark:text-white">
                Browse Categories
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {categoryDTOs.map((category, i) => (
                <CategoryCard key={category.id} category={category} index={i} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Feed + sidebar */}
      <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-4 font-display text-xl font-medium text-coastal-ink dark:text-white">
            {q ? `Results for "${q}"` : "Latest Discussions"}
          </h2>
          <PostList searchQuery={q} initialSort={q ? "new" : "hot"} />
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TrendingSidebar />
          </div>
        </aside>
      </section>
    </div>
  );
}
