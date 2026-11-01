/** POST /api/auth/passkey/verify — fingerprint login step 2 (public): { response, remember? } → session. */
import type { ApiContext } from "@dreamer/dweb";
import { passkeyLoginVerify } from "@common/service/security.ts";
import { clearChallengeCookie, readChallengeToken } from "@common/service/challenge.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function POST(ctx: ApiContext) {
  const body = await readBody(ctx);
  const result = await passkeyLoginVerify(
    ctx.req,
    readChallengeToken(ctx.req),
    body.response as never,
    body.remember === true || body.remember === "1",
  );
  if (!result) return jsonResponse({ error: "passkey_failed" }, 401, { "set-cookie": clearChallengeCookie() });
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("Set-Cookie", result.cookie);
  headers.append("Set-Cookie", clearChallengeCookie());
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
