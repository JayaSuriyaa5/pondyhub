import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/session";
import { createPostSchema, postQuerySchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { postSelect, toPostDTO } from "@/lib/postSerializer";
import { sanitizeHtml } from "@/lib/sanitize";
import type { PostDTO, PaginatedResult } from "@/types";
import { ZodError } from "zod";

// ----------------------------------------------------------------------------
// GET /api/posts — paginated feed. Supports:
//   ?categorySlug=webdev
//   ?sort=new|top|hot   (default "new")
//   ?cursor=<postId>    (for "load more" / infinite scroll)
//   ?limit=10
//   ?q=search+terms
//   ?authorUsername=jane
// ----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = postQuerySchema.parse({
      categorySlug: url.searchParams.get("categorySlug") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      authorUsername: url.searchParams.get("authorUsername") ?? undefined,
    });

    const currentUser = await getCurrentUser();

    const where: Prisma.PostWhereInput = { published: true };

    if (query.categorySlug) {
      where.category = { slug: query.categorySlug };
    }
    if (query.authorUsername) {
      where.author = { username: query.authorUsername };
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { content: { contains: query.q, mode: "insensitive" } },
      ];
    }

    // "hot" = high score weighted toward recency. We approximate this in
    // SQL-friendly terms by sorting on score first, then recency, rather
    // than a true decay function (which would need a raw query). This is
    // a reasonable MVP approximation; a true "hot" ranking (e.g. Reddit's
    // logarithmic decay) can be added later via a raw SQL view.
    const orderBy: Prisma.PostOrderByWithRelationInput[] =
      query.sort === "top"
        ? [{ score: "desc" }, { createdAt: "desc" }]
        : query.sort === "hot"
        ? [{ score: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      take: query.limit + 1, // fetch one extra to know if there's a next page
      ...(query.cursor
        ? { cursor: { id: query.cursor }, skip: 1 } // skip the cursor item itself
        : {}),
      select: postSelect(currentUser?.id ?? null),
    });

    const hasMore = posts.length > query.limit;
    const pageItems = hasMore ? posts.slice(0, query.limit) : posts;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

    const result: PaginatedResult<PostDTO> = {
      items: pageItems.map(toPostDTO),
      nextCursor,
      hasMore,
    };

    return apiSuccess(result);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POSTS GET ERROR]", err);
    return apiErrors.internal();
  }
}

// ----------------------------------------------------------------------------
// POST /api/posts — create a post. Requires auth. Rate limited to prevent
// spam (10 posts per 10 minutes per user).
// ----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const limitResult = rateLimit(`create-post:${user.id}`, 10, 10 * 60 * 1000);
    if (!limitResult.allowed) return apiErrors.rateLimited();

    const body = await request.json();
    const input = createPostSchema.parse(body);

    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      return apiErrors.notFound("Category");
    }

    const post = await prisma.post.create({
      data: {
        title: input.title,
        content: sanitizeHtml(input.content),
        authorId: user.id,
        categoryId: input.categoryId,
      },
      select: postSelect(user.id),
    });

    return apiSuccess({ post: toPostDTO(post) }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POSTS POST ERROR]", err);
    return apiErrors.internal();
  }
}
