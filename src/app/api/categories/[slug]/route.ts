import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { updateCategorySchema } from "@/lib/validation";
import { slugify } from "@/lib/slugify";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import type { CategoryDTO } from "@/types";
import { ZodError } from "zod";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { posts: true } } },
    });

    if (!category) return apiErrors.notFound("Category");

    const dto: CategoryDTO = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: category._count.posts,
      createdAt: category.createdAt.toISOString(),
    };

    return apiSuccess({ category: dto });
  } catch (err) {
    console.error("[CATEGORY GET ERROR]", err);
    return apiErrors.internal();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const { slug } = await params;
    const body = await request.json();
    const input = updateCategorySchema.parse(body);

    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) return apiErrors.notFound("Category");

    const data: { name?: string; slug?: string; description?: string | null } = {};
    if (input.name) {
      data.name = input.name;
      data.slug = slugify(input.name);
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }

    const updated = await prisma.category.update({ where: { slug }, data });

    const dto: CategoryDTO = {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
    };

    return apiSuccess({ category: dto });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[CATEGORY PATCH ERROR]", err);
    return apiErrors.internal();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const { slug } = await params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { posts: true } } },
    });
    if (!category) return apiErrors.notFound("Category");

    if (category._count.posts > 0) {
      return apiErrors.conflict(
        "This category still has posts. Move or delete them before deleting the category."
      );
    }

    await prisma.category.delete({ where: { slug } });

    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[CATEGORY DELETE ERROR]", err);
    return apiErrors.internal();
  }
}
