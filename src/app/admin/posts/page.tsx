import type { Metadata } from "next";
import { PostsTable } from "@/components/admin/PostsTable";

export const metadata: Metadata = {
  title: "Manage Posts",
};

export default function AdminPostsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Manage Posts
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Hide posts that violate community guidelines, or remove them permanently.
      </p>
      <div className="mt-6">
        <PostsTable />
      </div>
    </div>
  );
}
