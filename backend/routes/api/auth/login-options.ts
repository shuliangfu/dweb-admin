/**
 * Login feature flags — dual: `loginOptions` (action; kebab path login-options) + `GET` (restful).
 * Public, rate limited (see backend/main.ts).
 */
import type { ApiContext } from "@dreamer/dweb";
import { loginFeatures } from "@common/service/security.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function loginOptions(_ctx: ApiContext) {
  return jsonResponse(await loginFeatures(), 200, { "cache-control": "no-store" });
}

export const GET = loginOptions;
