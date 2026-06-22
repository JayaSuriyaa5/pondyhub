import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/siteConfig";
import { getCategoryVisual } from "@/lib/categoryVisuals";
import { PostList } from "@/components/posts/PostList";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: "Category not found" };

  return {
    title: category.name,
    description: category.description || `Browse ${category.name} discussions on ${siteConfig.name}.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { posts: true } } },
  });

  if (!category) notFound();

  const visual = getCategoryVisual(category.slug);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <div className="surface-card mt-6 flex items-center gap-4 p-6">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${visual.gradient} text-2xl text-white shadow-sm`}
        >
          <span aria-hidden="true">{visual.emoji}</span>
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{category.description}</p>
          )}
          <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
            {category._count.posts} {category._count.posts === 1 ? "post" : "posts"}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <PostList categorySlug={category.slug} />
      </div>
    </div>
  );
}
