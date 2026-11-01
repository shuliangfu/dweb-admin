/** POST /api/auth/passkey/options — fingerprint login step 1 (public): WebAuthn request options. */
import type { ApiContext } from "@dreamer/dweb";
import { passkeyLoginOptions } from "@common/service/security.ts";
import { challengeCookie } from "@common/service/challenge.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function POST(ctx: ApiContext) {
  const { options, token } = await passkeyLoginOptions(ctx.req);
  return jsonResponse({ options }, 200, { "set-cookie": challengeCookie(token) });
}
