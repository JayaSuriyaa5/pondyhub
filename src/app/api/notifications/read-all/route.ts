import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";

export async function POST() {
  try {
    const user = await requireUser();
    if (!user) return apiErrors.unauthorized();

    await prisma.notification.updateMany({
      where: { recipientId: user.id, read: false },
      data: { read: true },
    });

    return apiSuccess({ updated: true });
  } catch (err) {
    console.error("[NOTIFICATIONS READ-ALL ERROR]", err);
    return apiErrors.internal();
  }
}
