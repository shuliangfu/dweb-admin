/** Security overview — dual: `security` (action) + `GET` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { securityOverview } from "@common/service/security.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function security(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  const data = me ? await securityOverview(me.id) : null;
  return data ? jsonResponse(data) : jsonResponse({ error: "unauthorized" }, 401);
}

export const GET = security;
