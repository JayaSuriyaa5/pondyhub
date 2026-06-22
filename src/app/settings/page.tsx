import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SettingsForm } from "@/components/posts/SettingsForm";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Account Settings
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Update how you appear to the PondyHub community.
      </p>

      <div className="surface-card mt-6 p-6">
        <SettingsForm user={user} />
      </div>
    </div>
  );
}
