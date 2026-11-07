/** Action `hide` → POST /api/chat/hide — hide CS session from lobby (keep history). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { hasPermission } from "@common/service/rbac.ts";
import { createT, resolveLocale } from "@common/i18n/mod.ts";
import { hideCsSession, publishCsSession } from "@common/service/cs.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function hide(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  if (!await hasPermission(user.roleCodes, "cs.hide")) {
    const tr = createT(resolveLocale(ctx.req));
    return jsonResponse({ error: "forbidden", message: tr("error.forbidden") }, 403);
  }
  const body = await readBody(ctx);
  const sessionId = String(body.sessionId ?? "").trim();
  if (!sessionId) return jsonResponse({ error: "sessionId required" }, 400);
  const row = await hideCsSession(sessionId);
  if (!row) return jsonResponse({ error: "notFound" }, 404);
  publishCsSession({
    ...row,
    hidden: true,
    updatedAt: new Date().toISOString(),
  });
  return jsonResponse({ ok: true, session: row });
}
