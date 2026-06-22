import { clearAuthCookies } from "@/lib/session";
import { apiSuccess, apiErrors } from "@/lib/apiResponse";

export async function POST() {
  try {
    await clearAuthCookies();
    return apiSuccess({ loggedOut: true });
  } catch (err) {
    console.error("[LOGOUT ERROR]", err);
    return apiErrors.internal();
  }
}
