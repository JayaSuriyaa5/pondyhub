import type { Metadata } from "next";
import { UsersTable } from "@/components/admin/UsersTable";

export const metadata: Metadata = {
  title: "Manage Users",
};

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Manage Users
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ban disruptive accounts or adjust moderator/admin roles.
      </p>
      <div className="mt-6">
        <UsersTable />
      </div>
    </div>
  );
}
