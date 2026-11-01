/** Passkey login options — dual: `options` (action) + `POST` (restful). Public. */
import type { ApiContext } from "@dreamer/dweb";
import { passkeyLoginOptions } from "@common/service/security.ts";
import { challengeCookie } from "@common/service/challenge.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function options(ctx: ApiContext) {
  const { options: webauthn, token } = await passkeyLoginOptions(ctx.req);
  return jsonResponse({ options: webauthn }, 200, { "set-cookie": challengeCookie(token) });
}

