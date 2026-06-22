import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";
import type { CategoryDTO } from "@/types";

// GET /api/admin/categories — full category list for the admin table.
// (Create/update/delete continue to go through /api/categories and
// /api/categories/[slug], which already enforce admin-only writes — this
// route exists purely so the admin dashboard has one clear endpoint to
// call for its table view, without depending on the public-facing route's
// response shape changing later.)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });

    const dtos: CategoryDTO[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      postCount: c._count.posts,
      createdAt: c.createdAt.toISOString(),
    }));

    return apiSuccess({ categories: dtos });
  } catch (err) {
    console.error("[ADMIN CATEGORIES GET ERROR]", err);
    return apiErrors.internal();
  }
}
