/**
 * POST /api/auth/login — JSON ({username,password,remember?}) → JSON; HTML form → 302.
 * With 2FA on the response is `{status:"2fa"}` / redirect to /login?step=2fa and a
 * short-lived challenge cookie; the code is then posted to /api/auth/twofactor.
 * Public path (see common/service/rbac.ts).
 */
import type { ApiContext } from "@dreamer/dweb";
import { clientMeta, login } from "@common/service/auth.ts";
import { challengeCookie } from "@common/service/challenge.ts";
import { isFormRequest, jsonResponse, readBody } from "@common/utils/http.ts";

const truthy = (v: unknown) => v === true || v === "1" || v === "on" || v === "true";

export async function POST(ctx: ApiContext) {
  const form = isFormRequest(ctx.req);
  const body = await readBody(ctx);
  const result = await login(
    String(body.username ?? ""),
    String(body.password ?? ""),
    truthy(body.remember),
    clientMeta(ctx.req),
  );
  if (!result) {
    return form
      ? new Response(null, { status: 302, headers: { Location: "/login?e=1" } })
      : jsonResponse({ error: "invalid_credentials" }, 401);
  }
  if (result.status === "2fa") {
    const cookie = challengeCookie(result.challengeToken);
    return form
      ? new Response(null, { status: 302, headers: { Location: "/login?step=2fa", "Set-Cookie": cookie } })
      : jsonResponse({ ok: true, status: "2fa" }, 200, { "set-cookie": cookie });
  }
  if (form) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/", "Set-Cookie": result.cookie },
    });
  }
  const { user } = result;
  return jsonResponse({ ok: true, user: { username: user.username, roleCodes: user.roleCodes } }, 200, {
    "set-cookie": result.cookie,
  });
}
