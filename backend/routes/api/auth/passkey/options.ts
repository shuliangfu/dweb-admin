/** Passkey options — dual: `options` (action) + `POST` (restful). Public.
 *  - With a live `passkey-gate` cookie → user-bound post-password fingerprint gate.
 *  - Otherwise → discoverable-credential login (passwordless).
 */
import type { ApiContext } from "@dreamer/dweb";
import { passkeyGateOptions, passkeyLoginOptions } from "@common/service/security.ts";
import {
  challengeCookie,
  peekChallenge,
  readChallengeToken,
} from "@common/service/challenge.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function options(ctx: ApiContext) {
  const token = readChallengeToken(ctx.req);
  if (token && await peekChallenge(token, "passkey-gate")) {
    const gate = await passkeyGateOptions(token, ctx.req);
    if (!gate) return jsonResponse({ error: "passkey_failed" }, 401);
    return jsonResponse({ options: gate.options, mode: "gate" }, 200, {
      "set-cookie": challengeCookie(gate.token),
    });
  }
  const { options: webauthn, token: loginToken } = await passkeyLoginOptions(ctx.req);
  return jsonResponse({ options: webauthn, mode: "login" }, 200, {
    "set-cookie": challengeCookie(loginToken),
  });
}
