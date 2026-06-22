"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/posts/RichTextEditor";
import type { CategoryDTO } from "@/types";

interface PostFormProps {
  categories: CategoryDTO[];
  mode: "create" | "edit";
  postId?: string;
  initialValues?: {
    title: string;
    content: string;
    categoryId: string;
  };
}

export function PostForm({ categories, mode, postId, initialValues }: PostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? categories[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const endpoint = mode === "create" ? "/api/posts" : `/api/posts/${postId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, categoryId }),
      });
      const json: { success: boolean; data?: { post: { id: string } }; error?: { message: string; fieldErrors?: Record<string, string[]> } } =
        await res.json();

      if (!json.success) {
        setFormError(json.error?.message || "Something went wrong. Please try again.");
        setFieldErrors(json.error?.fieldErrors || {});
        return;
      }

      router.push(`/posts/${json.data!.post.id}`);
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {formError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-coastal-ink dark:text-slate-200">
          Category
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-coastal-shell px-3 py-2 text-sm text-coastal-ink focus:outline-none focus:ring-2 focus:ring-coastal-ocean dark:border-abyss-700 dark:bg-abyss-900 dark:text-slate-100"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.categoryId[0]}</p>
        )}
      </div>

      <Input
        label="Title"
        name="title"
        required
        maxLength={300}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's happening in Pondicherry?"
        error={fieldErrors.title?.[0]}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-coastal-ink dark:text-slate-200">
          Content
        </label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Share the details..."
          error={fieldErrors.content?.[0]}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Publish Post" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
