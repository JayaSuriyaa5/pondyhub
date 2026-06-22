import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apiSuccess, apiErrors, apiValidationError } from "@/lib/apiResponse";
import { ZodError } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const adminUpdateUserSchema = z.object({
  isBanned: z.boolean().optional(),
  role: z.enum(["USER", "MODERATOR", "ADMIN"]).optional(),
});

// PATCH /api/admin/users/[id] — ban/unban a user, or change their role.
//
// Permission rules (deliberately conservative for an MVP moderation
// surface):
//   - Only ADMIN can change roles or act on another ADMIN's account.
//   - MODERATOR can ban/unban regular USERs, but cannot touch other
//     moderators or admins, and cannot grant roles.
//   - Nobody can ban or demote themselves via this endpoint, to avoid
//     accidentally locking the only admin out of the dashboard.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiErrors.forbidden();

    const { id } = await params;

    if (id === admin.id) {
      return apiErrors.conflict("You can't change your own role or ban status.");
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return apiErrors.notFound("User");

    const body = await request.json();
    const input = adminUpdateUserSchema.parse(body);

    const actorIsAdmin = admin.role === "ADMIN";
    const targetIsPrivileged = targetUser.role === "ADMIN" || targetUser.role === "MODERATOR";

    // A moderator cannot act on another moderator or an admin.
    if (!actorIsAdmin && targetIsPrivileged) {
      return apiErrors.forbidden();
    }

    // Only a full admin can change roles.
    if (input.role !== undefined && !actorIsAdmin) {
      return apiErrors.forbidden();
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.isBanned !== undefined ? { isBanned: input.isBanned } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
    });

    return apiSuccess({
      user: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[ADMIN USER PATCH ERROR]", err);
    return apiErrors.internal();
  }
}
