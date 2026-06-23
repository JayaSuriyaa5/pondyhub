import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { apiSuccess, apiError, apiErrors } from "@/lib/apiResponse";
import {
  validateAvatarFile,
  saveAvatarFile,
  deleteAvatarFile,
} from "@/lib/avatarUpload";

interface Params {
  params: Promise<{ username: string }>;
}

// POST /api/users/[username]/avatar — upload (or replace) the current
// user's avatar. Like PATCH /api/users/[username], a user may only ever
// modify their own avatar (no admin-on-behalf-of-user path in this MVP).
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await requireUser();
    if (!currentUser) return apiErrors.unauthorized();

    const { username } = await params;
    if (currentUser.username !== username) {
      return apiErrors.forbidden();
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!file || !(file instanceof File)) {
      return apiErrors.notFound("Avatar file");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validates by inspecting actual file content (magic bytes), not the
    // client-supplied filename or Content-Type -- see avatarUpload.ts.
    const validation = validateAvatarFile(buffer);
    if (!validation.valid) {
      return apiError(validation.error.message, 422, { code: validation.error.code });
    }

    // Look up the existing avatar before overwriting the DB row, so we
    // know what (if anything) to delete from disk afterward.
    const existing = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { avatarUrl: true },
    });

    const newAvatarUrl = await saveAvatarFile(currentUser.id, buffer, validation.detectedType);

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: { avatarUrl: newAvatarUrl },
      select: { avatarUrl: true },
    });

    // Best-effort cleanup of the previous file, now that the new one is
    // safely written and the DB row points at it. Done last and never
    // awaited-as-blocking-on-failure, so a cleanup hiccup never leaves
    // the user's avatar update looking like it failed.
    if (existing?.avatarUrl) {
      void deleteAvatarFile(existing.avatarUrl);
    }

    return apiSuccess({ avatarUrl: updated.avatarUrl });
  } catch (err) {
    console.error("[AVATAR UPLOAD ERROR]", err);
    return apiErrors.internal();
  }
}

// DELETE /api/users/[username]/avatar — remove the current user's
// avatar, reverting them to the default initials placeholder (handled
// automatically by the existing Avatar.tsx component whenever
// avatarUrl is null).
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const currentUser = await requireUser();
    if (!currentUser) return apiErrors.unauthorized();

    const { username } = await params;
    if (currentUser.username !== username) {
      return apiErrors.forbidden();
    }

    const existing = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { avatarUrl: true },
    });

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { avatarUrl: null },
    });

    if (existing?.avatarUrl) {
      void deleteAvatarFile(existing.avatarUrl);
    }

    return apiSuccess({ avatarUrl: null });
  } catch (err) {
    console.error("[AVATAR DELETE ERROR]", err);
    return apiErrors.internal();
  }
}

