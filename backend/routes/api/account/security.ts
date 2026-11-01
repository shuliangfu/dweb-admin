/** GET /api/account/security — own security state (2FA, passkeys). Any logged-in user. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { securityOverview } from "@common/service/security.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function GET(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  const data = me ? await securityOverview(me.id) : null;
  return data ? jsonResponse(data) : jsonResponse({ error: "unauthorized" }, 401);
}
