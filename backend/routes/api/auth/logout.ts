/** Auth logout — dual: `logout` (action) + `POST` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { clearAuthCookie, logout as doLogout } from "@common/service/auth.ts";

export async function logout(ctx: ApiContext) {
  await doLogout(ctx.req);
  return new Response(null, {
    status: 302,
    headers: { Location: "/login", "Set-Cookie": clearAuthCookie() },
  });
}

export const POST = logout;
