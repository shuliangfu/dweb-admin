/**
 * Screen unlock — dual: `unlock` (action) + `POST` (restful).
 * Auth required (session still valid while the UI is locked).
 */
import type { ApiContext } from "@dreamer/dweb";
import { unlock as doUnlock } from "@common/service/auth.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function unlock(ctx: ApiContext) {
  const body = await readBody(ctx);
  const password = String(body.password ?? "");
  const ok = await doUnlock(ctx.req, password);
  if (!ok) return jsonResponse({ error: "invalid_credentials" }, 401);
  return jsonResponse({ ok: true });
}

