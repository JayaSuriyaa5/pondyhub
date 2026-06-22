import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return apiErrors.notFound("Notification");

    // Ownership check: a user can only mark their own notifications read,
    // not arbitrary ones by guessing IDs.
    if (notification.recipientId !== user.id) {
      return apiErrors.forbidden();
    }

    await prisma.notification.update({ where: { id }, data: { read: true } });

    return apiSuccess({ updated: true });
  } catch (err) {
    console.error("[NOTIFICATION READ ERROR]", err);
    return apiErrors.internal();
  }
}
