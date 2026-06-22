import { getCurrentUser } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiErrors.unauthorized();
    }
    return apiSuccess({ user });
  } catch (err) {
    console.error("[ME ERROR]", err);
    return apiErrors.internal();
  }
}
