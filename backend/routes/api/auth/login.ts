/**
 * Auth login — dual API template (restful + action).
 * - restful: `POST`  → POST /api/auth/login
 * - action:  `login` → POST /api/auth/login (path segment / :method)
 * Public path (see common/service/rbac.ts).
 */
import type { ApiContext } from "@dreamer/dweb";
import { clientMeta, login as doLogin } from "@common/service/auth.ts";
import { challengeCookie } from "@common/service/challenge.ts";
import { isFormRequest, jsonResponse, readBody } from "@common/utils/http.ts";

const truthy = (v: unknown) => v === true || v === "1" || v === "on" || v === "true";

/** Action-style handler (apiMode: "action"). */
export async function login(ctx: ApiContext) {
  const form = isFormRequest(ctx.req);
  const body = await readBody(ctx);
  const result = await doLogin(
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

/** RESTful alias (apiMode: "restful", default). */
export const POST = login;
