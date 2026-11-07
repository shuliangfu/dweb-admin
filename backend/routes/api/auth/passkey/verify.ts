/** Passkey verify — dual: `verify` (action) + `POST` (restful). Public.
 *  Gate mode may continue to 2FA when TOTP is also enabled.
 */
import type { ApiContext } from "@dreamer/dweb";
import { passkeyGateVerify, passkeyLoginVerify } from "@common/service/security.ts";
import {
  challengeCookie,
  clearChallengeCookie,
  peekChallenge,
  readChallengeToken,
} from "@common/service/challenge.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function verify(ctx: ApiContext) {
  const body = await readBody(ctx);
  const token = readChallengeToken(ctx.req);
  const response = body.response as never;
  const remember = body.remember === true || body.remember === "1";

  if (token && await peekChallenge(token, "passkey-gate")) {
    const result = await passkeyGateVerify(ctx.req, token, response);
    if (!result) {
      return jsonResponse({ error: "passkey_failed" }, 401, {
        "set-cookie": clearChallengeCookie(),
      });
    }
    if (result.status === "2fa") {
      return jsonResponse({ ok: true, status: "2fa" }, 200, {
        "set-cookie": challengeCookie(result.challengeToken),
      });
    }
    const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
    headers.append("Set-Cookie", result.cookie);
    headers.append("Set-Cookie", clearChallengeCookie());
    return new Response(JSON.stringify({ ok: true, status: "ok" }), { status: 200, headers });
  }

  const result = await passkeyLoginVerify(ctx.req, token, response, remember);
  if (!result) {
    return jsonResponse({ error: "passkey_failed" }, 401, {
      "set-cookie": clearChallengeCookie(),
    });
  }
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("Set-Cookie", result.cookie);
  headers.append("Set-Cookie", clearChallengeCookie());
  return new Response(JSON.stringify({ ok: true, status: "ok" }), { status: 200, headers });
}
