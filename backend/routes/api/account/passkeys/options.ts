/** POST /api/account/passkeys/options — enrol step 1: WebAuthn creation options. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { passkeyRegisterOptions } from "@common/service/security.ts";
import { challengeCookie } from "@common/service/challenge.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function POST(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  const r = me ? await passkeyRegisterOptions(me.id, ctx.req) : null;
  if (!r) return jsonResponse({ error: "unauthorized" }, 401);
  return jsonResponse({ options: r.options }, 200, { "set-cookie": challengeCookie(r.token) });
}
