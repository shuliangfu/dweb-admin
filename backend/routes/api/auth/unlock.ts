/**
 * POST /api/auth/unlock — { password } verifies the current user's password for screen unlock.
 * Auth required (session still valid while the UI is locked).
 */
import type { ApiContext } from "@dreamer/dweb";
import { unlock } from "@common/service/auth.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function POST(ctx: ApiContext) {
  const body = await readBody(ctx);
  const password = String(body.password ?? "");
  const ok = await unlock(ctx.req, password);
  if (!ok) return jsonResponse({ error: "invalid_credentials" }, 401);
  return jsonResponse({ ok: true });
}
