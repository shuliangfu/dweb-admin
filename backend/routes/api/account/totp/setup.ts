/** POST /api/account/totp/setup — begin Google Authenticator setup: returns { secret, qrCode, otpauthUrl }. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { totpBegin } from "@common/service/security.ts";
import { jsonResponse } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function POST(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  const r = await totpBegin(me.id);
  return r.ok ? jsonResponse(r) : respond(ctx.req, r);
}
