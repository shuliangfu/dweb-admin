/**
 * Action `detail` → /cs/detail?sessionId=&guestToken= — guest loads history.
 * Returns wsUrl (page-origin when proxied) so restored sessions reconnect same-origin.
 */
import type { ApiContext } from "@dreamer/dweb";
import { getCsDetail, guestFromToken } from "@common/service/cs.ts";
import { csWsUrl } from "@common/utils/cs-ws.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function detail(ctx: ApiContext) {
  const url = new URL(ctx.req.url);
  const sessionId = (url.searchParams.get("sessionId") ?? "").trim();
  const guestToken = (url.searchParams.get("guestToken") ?? "").trim();
  if (!sessionId || !guestToken) {
    return jsonResponse({ error: "sessionId and guestToken required" }, 400);
  }
  const guest = await guestFromToken(guestToken);
  if (!guest || guest.sessionId !== sessionId) {
    return jsonResponse({ error: "forbidden" }, 403);
  }
  const data = await getCsDetail(sessionId);
  return jsonResponse({
    ...data,
    wsUrl: csWsUrl(ctx.req),
  });
}
