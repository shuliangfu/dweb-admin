/** TOTP enable — dual: `enable` (action) + `POST` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { totpEnable } from "@common/service/security.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function enable(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  return respond(ctx.req, await totpEnable(me.id, String((await readBody(ctx)).code ?? "")));
}

