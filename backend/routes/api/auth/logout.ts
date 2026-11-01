/** POST /api/auth/logout — deletes the server session, clears the cookie, redirects to /login. */
import type { ApiContext } from "@dreamer/dweb";
import { clearAuthCookie, logout } from "@common/service/auth.ts";

export async function POST(ctx: ApiContext) {
  await logout(ctx.req);
  return new Response(null, {
    status: 302,
    headers: { Location: "/login", "Set-Cookie": clearAuthCookie() },
  });
}
