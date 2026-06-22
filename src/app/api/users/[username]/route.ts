import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { updateProfileSchema } from "@/lib/validation";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { ZodError } from "zod";

interface Params {
  params: Promise<{ username: string }>;
}

// GET /api/users/[username] — public profile. Returns aggregate stats
// (post/comment counts) but never the email or password hash.
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });

    if (!user) return apiErrors.notFound("User");

    const [postScoreAgg, commentScoreAgg] = await Promise.all([
      prisma.post.aggregate({ where: { authorId: user.id }, _sum: { score: true } }),
      prisma.comment.aggregate({ where: { authorId: user.id }, _sum: { score: true } }),
    ]);

    const karma = (postScoreAgg._sum.score ?? 0) + (commentScoreAgg._sum.score ?? 0);

    return apiSuccess({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        postCount: user._count.posts,
        commentCount: user._count.comments,
        karma,
      },
    });
  } catch (err) {
    console.error("[USER PROFILE GET ERROR]", err);
    return apiErrors.internal();
  }
}

// PATCH /api/users/[username] — update own profile (displayName, bio only
// in this MVP; avatar upload is handled by a separate endpoint/step).
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await requireUser();
    if (!currentUser) return apiErrors.unauthorized();

    const { username } = await params;
    if (currentUser.username !== username) {
      return apiErrors.forbidden();
    }

    const body = await request.json();
    const input = updateProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
      },
    });

    return apiSuccess({
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        displayName: updated.displayName,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        isBanned: updated.isBanned,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[USER PROFILE PATCH ERROR]", err);
    return apiErrors.internal();
  }
}
