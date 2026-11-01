/** POST /api/auth/twofactor — login step 2: { code } + challenge cookie → session. Public path. */
import type { ApiContext } from "@dreamer/dweb";
import { completeTwoFactor } from "@common/service/security.ts";
import { clearChallengeCookie, readChallengeToken } from "@common/service/challenge.ts";
import { isFormRequest, jsonResponse, readBody } from "@common/utils/http.ts";

export async function POST(ctx: ApiContext) {
  const form = isFormRequest(ctx.req);
  const body = await readBody(ctx);
  const result = await completeTwoFactor(readChallengeToken(ctx.req), String(body.code ?? ""));
  if (!result) {
    return form
      ? new Response(null, { status: 302, headers: { Location: "/login?step=2fa&e=1" } })
      : jsonResponse({ error: "invalid_code" }, 401);
  }
  const headers = new Headers({ Location: "/" });
  headers.append("Set-Cookie", result.cookie);
  headers.append("Set-Cookie", clearChallengeCookie());
  return form
    ? new Response(null, { status: 302, headers })
    : new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: (() => {
        headers.delete("Location");
        headers.set("content-type", "application/json; charset=utf-8");
        return headers;
      })(),
    });
}
