import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { createCategorySchema } from "@/lib/validation";
import { slugify, slugifyWithSuffix } from "@/lib/slugify";
import {
  apiSuccess,
  apiErrors,
  apiValidationError,
} from "@/lib/apiResponse";
import type { CategoryDTO } from "@/types";
import { ZodError } from "zod";

// GET /api/categories — public list, includes post counts for the sidebar /
// category nav. No auth required.
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { posts: true } },
      },
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
    console.error("[CATEGORIES GET ERROR]", err);
    return apiErrors.internal();
  }
}

// POST /api/categories — admin/moderator only.
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const body = await request.json();
    const input = createCategorySchema.parse(body);

    let slug = slugify(input.name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      slug = slugifyWithSuffix(input.name);
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
      },
    });

    const dto: CategoryDTO = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: 0,
      createdAt: category.createdAt.toISOString(),
    };

    return apiSuccess({ category: dto }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[CATEGORIES POST ERROR]", err);
    return apiErrors.internal();
  }
}
