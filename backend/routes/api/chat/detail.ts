/** Action `detail` → /api/chat/detail?sessionId= — admin CS chat detail. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { hasPermission } from "@common/service/rbac.ts";
import { createT, resolveLocale } from "@common/i18n/mod.ts";
import { getCsDetail } from "@common/service/cs.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function detail(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  if (!await hasPermission(user.roleCodes, "cs.view")) {
    const tr = createT(resolveLocale(ctx.req));
    return jsonResponse({ error: "forbidden", message: tr("error.forbidden") }, 403);
  }
  const url = new URL(ctx.req.url);
  const sessionId = (url.searchParams.get("sessionId") ?? "").trim();
  if (!sessionId) return jsonResponse({ error: "sessionId required" }, 400);
  const data = await getCsDetail(sessionId);
  return jsonResponse(data);
}
