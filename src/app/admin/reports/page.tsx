import type { Metadata } from "next";
import { ReportsTable } from "@/components/admin/ReportsTable";

export const metadata: Metadata = {
  title: "Reports",
};

export default function AdminReportsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Reports
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Review flagged posts and comments, and take action on repeat or severe violations.
      </p>
      <div className="mt-6">
        <ReportsTable />
      </div>
    </div>
  );
}
