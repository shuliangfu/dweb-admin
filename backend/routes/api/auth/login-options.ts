/**
 * GET /api/auth/login-options — public, rate limited (see backend/main.ts).
 * Tells the login page which optional sign-in methods to render. The answer is global
 * (identical for every caller), so it does not reveal whether any username exists.
 */
import type { ApiContext } from "@dreamer/dweb";
import { loginFeatures } from "@common/service/security.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function GET(_ctx: ApiContext) {
  return jsonResponse(await loginFeatures(), 200, { "cache-control": "no-store" });
}
