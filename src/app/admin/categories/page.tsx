import type { Metadata } from "next";
import { CategoriesTable } from "@/components/admin/CategoriesTable";

export const metadata: Metadata = {
  title: "Manage Categories",
};

export default function AdminCategoriesPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Manage Categories
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Create, edit, or remove discussion categories.
      </p>
      <div className="mt-6">
        <CategoriesTable />
      </div>
    </div>
  );
}
