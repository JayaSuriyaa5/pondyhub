import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PostForm } from "@/components/posts/PostForm";
import type { CategoryDTO } from "@/types";

export const metadata: Metadata = {
  title: "Edit Post",
};

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?next=/posts/${id}/edit`);
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();

  const isOwner = post.authorId === currentUser.id;
  const canModerate = currentUser.role === "ADMIN" || currentUser.role === "MODERATOR";

  // Server-side enforcement: even if someone navigates directly to this
  // URL, only the post's author or a moderator/admin can reach the edit
  // form. The Edit button being hidden client-side is a UX nicety, not
  // the actual security boundary — this redirect is.
  if (!isOwner && !canModerate) {
    redirect(`/posts/${id}`);
  }

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
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">Edit post</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Update your post's details below.
      </p>

      <div className="surface-card mt-6 p-6">
        <PostForm
          categories={categoryDTOs}
          mode="edit"
          postId={post.id}
          initialValues={{
            title: post.title,
            content: post.content,
            categoryId: post.categoryId,
          }}
        />
      </div>
    </div>
  );
}
