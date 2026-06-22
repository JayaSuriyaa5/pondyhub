import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NotificationsPageClient } from "@/components/posts/NotificationsPageClient";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/notifications");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-medium text-coastal-ink dark:text-white">
        Notifications
      </h1>
      <div className="mt-6">
        <NotificationsPageClient />
      </div>
    </div>
  );
}
