import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/posts/PostForm";
import type { CategoryDTO } from "@/types";

export const metadata: Metadata = {
  title: "Create Post",
};

export default async function NewPostPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const categoryDTOs: CategoryDTO[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Start a discussion
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Share something with the PondyHub community.
      </p>

      <div className="surface-card mt-6 p-6">
        <PostForm categories={categoryDTOs} mode="create" />
      </div>
    </div>
  );
}
