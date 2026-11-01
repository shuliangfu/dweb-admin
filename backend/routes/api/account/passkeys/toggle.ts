/** POST /api/account/passkeys/toggle — { enabled: boolean }: fingerprint login on/off. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { passkeySetEnabled } from "@common/service/security.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function POST(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  return respond(ctx.req, await passkeySetEnabled(me.id, (await readBody(ctx)).enabled === true));
}
