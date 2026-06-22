"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getCategoryVisual } from "@/lib/categoryVisuals";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CategoryDTO } from "@/types";

export function CategoriesTable() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  function loadCategories() {
    setIsLoading(true);
    fetch("/api/admin/categories", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: { categories: CategoryDTO[] } }) => {
        if (json.success && json.data) setCategories(json.data.categories);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription || null }),
      });
      const json: { success: boolean; error?: { message: string } } = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Couldn't create category.");
        return;
      }
      setNewName("");
      setNewDescription("");
      setShowCreateForm(false);
      loadCategories();
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(category: CategoryDTO) {
    setEditingSlug(category.slug);
    setEditName(category.name);
    setEditDescription(category.description || "");
  }

  async function handleSaveEdit(slug: string) {
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription || null }),
      });
      const json: { success: boolean; error?: { message: string } } = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Couldn't save changes.");
        return;
      }
      setEditingSlug(null);
      loadCategories();
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!window.confirm("Delete this category? This only works if it has no posts.")) return;
    setDeletingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${slug}`, { method: "DELETE" });
      const json: { success: boolean; error?: { message: string } } = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Couldn't delete category.");
        return;
      }
      loadCategories();
    } finally {
      setDeletingSlug(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? "Cancel" : "+ New Category"}
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreate} className="surface-card mb-4 flex flex-col gap-3 p-4">
          <Input
            label="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            maxLength={50}
          />
          <Input
            label="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            maxLength={300}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={isCreating}>
              Create
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading && <p className="text-sm text-slate-400">Loading categories...</p>}
        {!isLoading && categories.length === 0 && (
          <p className="text-sm text-slate-400">No categories yet.</p>
        )}
        {categories.map((category) => {
          const visual = getCategoryVisual(category.slug);
          const isEditing = editingSlug === category.slug;

          return (
            <div key={category.id} className="surface-card p-4">
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={300}
                    placeholder="Description"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingSlug(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" isLoading={isSavingEdit} onClick={() => handleSaveEdit(category.slug)}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.gradient} text-lg text-white`}
                  >
                    <span aria-hidden="true">{visual.emoji}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-coastal-ink dark:text-slate-200">{category.name}</p>
                    {category.description && (
                      <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        {category.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {category.postCount ?? 0} posts
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(category)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 dark:text-red-400"
                      isLoading={deletingSlug === category.slug}
                      onClick={() => handleDelete(category.slug)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
