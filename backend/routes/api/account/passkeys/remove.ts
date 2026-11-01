/** Passkey remove — dual: `remove` (action) + `POST` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { passkeyRemove } from "@common/service/security.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function remove(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  return respond(ctx.req, await passkeyRemove(me.id, String((await readBody(ctx)).id ?? "")));
}

