/** Current user — dual: `me` (action) + `GET` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function me(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  return jsonResponse({ user });
}

