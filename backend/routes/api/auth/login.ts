/**
 * Auth login — action `login` → POST /api/auth/login (public).
 * HTML form posts always require the captcha cookie + body.captcha.
 * JSON clients are checked only when a captcha cookie is already present,
 * so API logins that never loaded the image keep working.
 */
import type { ApiContext } from "@dreamer/dweb";
import { clientMeta, login as doLogin } from "@common/service/auth.ts";
import { challengeCookie } from "@common/service/challenge.ts";
import {
  CAPTCHA_COOKIE,
  clearCaptchaCookie,
  verifyCaptcha,
} from "@common/service/captcha.ts";
import { isFormRequest, readBody } from "@common/utils/http.ts";

const truthy = (v: unknown) =>
  v === true || v === "1" || v === "on" || v === "true";

function hasCaptchaCookie(req: Request): boolean {
  return (req.headers.get("cookie") ?? "").includes(`${CAPTCHA_COOKIE}=`);
}

function jsonWithCookies(
  body: unknown,
  status: number,
  cookies: string[],
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Action-style handler (apiMode: "action"). */
export async function login(ctx: ApiContext) {
  const form = isFormRequest(ctx.req);
  const body = await readBody(ctx);
  const needCaptcha = form || hasCaptchaCookie(ctx.req);
  if (needCaptcha) {
    const ok = await verifyCaptcha(ctx.req, String(body.captcha ?? ""));
    if (!ok) {
      if (form) {
        const headers = new Headers({ Location: "/login?e=captcha" });
        headers.append("Set-Cookie", clearCaptchaCookie());
        return new Response(null, { status: 302, headers });
      }
      return jsonWithCookies({ error: "invalid_captcha" }, 400, [
        clearCaptchaCookie(),
      ]);
    }
  }
  const result = await doLogin(
    String(body.username ?? ""),
    String(body.password ?? ""),
    truthy(body.remember),
    clientMeta(ctx.req),
  );
  if (!result) {
    if (form) {
      const headers = new Headers({ Location: "/login?e=1" });
      headers.append("Set-Cookie", clearCaptchaCookie());
      return new Response(null, { status: 302, headers });
    }
    return jsonWithCookies({ error: "invalid_credentials" }, 401, [
      clearCaptchaCookie(),
    ]);
  }
  if (result.status === "2fa") {
    if (form) {
      const headers = new Headers({ Location: "/login?step=2fa" });
      headers.append("Set-Cookie", challengeCookie(result.challengeToken));
      headers.append("Set-Cookie", clearCaptchaCookie());
      return new Response(null, { status: 302, headers });
    }
    return jsonWithCookies({ ok: true, status: "2fa" }, 200, [
      challengeCookie(result.challengeToken),
      clearCaptchaCookie(),
    ]);
  }
  if (form) {
    const headers = new Headers({ Location: "/" });
    headers.append("Set-Cookie", result.cookie);
    headers.append("Set-Cookie", clearCaptchaCookie());
    return new Response(null, { status: 302, headers });
  }
  const { user } = result;
  return jsonWithCookies(
    { ok: true, user: { username: user.username, roleCodes: user.roleCodes } },
    200,
    [result.cookie, clearCaptchaCookie()],
  );
}
