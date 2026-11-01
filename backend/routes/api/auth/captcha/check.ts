/**
 * Verify captcha for the forget-password form.
 * POST /api/auth/captcha/check (public, action `check`).
 * Mail is not sent — there is no mail transport in this repo.
 */
import type { ApiContext } from "@dreamer/dweb";
import { clearCaptchaCookie, verifyCaptcha } from "@common/service/captcha.ts";
import { readBody } from "@common/utils/http.ts";

export async function check(ctx: ApiContext) {
  const body = await readBody(ctx);
  const ok = await verifyCaptcha(ctx.req, String(body.captcha ?? ""));
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  headers.append("Set-Cookie", clearCaptchaCookie());
  if (!ok) {
    return new Response(JSON.stringify({ error: "invalid_captcha" }), {
      status: 400,
      headers,
    });
  }
  return new Response(
    JSON.stringify({
      ok: true,
      mail: false,
      email: String(body.email ?? "").slice(0, 128),
    }),
    { status: 200, headers },
  );
}
