/** Action `sessions` → GET/POST /api/chat/sessions — admin CS session list + WS bootstrap. */
import type { ApiContext } from "@dreamer/dweb";
import {
  getCurrentUser,
  readAdminSessionToken,
} from "@common/service/auth.ts";
import { listCsSessions } from "@common/service/cs.ts";
import { csWsUrl } from "@common/utils/cs-ws.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function sessions(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  const sessions = await listCsSessions(80);
  return jsonResponse({
    sessions,
    wsUrl: csWsUrl(),
    adminWsToken: readAdminSessionToken(ctx.req),
  });
}
