/** Action `claim` → POST /api/chat/claim — admin claims a CS session (MVP). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { hasPermission } from "@common/service/rbac.ts";
import { createT, resolveLocale } from "@common/i18n/mod.ts";
import { publishCsSession } from "@common/service/cs.ts";
import { claimCsSessionQueued } from "@common/service/cs-claim-queue.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function claim(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  if (!await hasPermission(user.roleCodes, "cs.claim")) {
    const tr = createT(resolveLocale(ctx.req));
    return jsonResponse({ error: "forbidden", message: tr("error.forbidden") }, 403);
  }
  const body = await readBody(ctx);
  const sessionId = String(body.sessionId ?? "").trim();
  if (!sessionId) return jsonResponse({ error: "sessionId required" }, 400);
  // @dreamer/queue concurrency=1 + atomic Mongo claim
  const result = await claimCsSessionQueued(sessionId, {
    id: user.id,
    name: user.nickname || user.username || "admin",
  });
  if (!result.ok) {
    const status = result.code === "notFound"
      ? 404
      : result.code === "conflict"
      ? 409
      : 400;
    return jsonResponse(
      { error: result.code, message: result.message },
      status,
    );
  }
  // Lobby: leave 待认领 for others; land in 我的 for claimer.
  publishCsSession({
    ...result.session,
    hidden: false,
  });
  return jsonResponse({
    ok: true,
    already: result.already === true,
    session: result.session,
  });
}
