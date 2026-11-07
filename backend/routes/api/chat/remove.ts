/** Action `remove` → POST /api/chat/remove — delete CS session + all messages. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { hasPermission } from "@common/service/rbac.ts";
import { createT, resolveLocale } from "@common/i18n/mod.ts";
import { deleteCsSession, publishCsSession } from "@common/service/cs.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function remove(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  if (!await hasPermission(user.roleCodes, "cs.remove")) {
    const tr = createT(resolveLocale(ctx.req));
    return jsonResponse({ error: "forbidden", message: tr("error.forbidden") }, 403);
  }
  const body = await readBody(ctx);
  const sessionId = String(body.sessionId ?? "").trim();
  if (!sessionId) return jsonResponse({ error: "sessionId required" }, 400);
  try {
    const ok = await deleteCsSession(sessionId);
    if (!ok) return jsonResponse({ error: "notFound" }, 404);
  } catch (e) {
    console.error("[cs] deleteCsSession failed", sessionId, e);
    return jsonResponse({ error: "deleteFailed" }, 500);
  }
  // Lobby drop signal (no-op if publisher lives in another process; FE tombstone covers that).
  publishCsSession({
    id: sessionId,
    guestName: "",
    status: "closed",
    lastPreview: "",
    updatedAt: new Date().toISOString(),
    online: false,
    hidden: true,
  });
  return jsonResponse({ ok: true });
}
