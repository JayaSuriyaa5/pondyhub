import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Defense in depth: middleware.ts already redirects unauthenticated or
  // under-privileged users away from /admin/*, but we re-check here too.
  // Middleware only validates the JWT's role claim without touching the
  // database (it can't import Prisma in the edge runtime); this check
  // hits the database via getCurrentUser() and will also catch a user
  // who was demoted or banned after their access token was issued but
  // before it expired.
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 lg:hidden">
        <AdminMobileNav />
      </div>
      <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden glass rounded-2xl lg:block">
          <AdminSidebar />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
