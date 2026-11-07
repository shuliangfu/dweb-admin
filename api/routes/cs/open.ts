/**
 * Action `open` → /cs/open — guest creates a CS session.
 * Body optional: { guestName?: string }
 */
import type { ApiContext } from "@dreamer/dweb";
import { createGuestSession } from "@common/service/cs.ts";
import { csWsUrl } from "@common/utils/cs-ws.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function open(ctx: ApiContext) {
  const body = await readBody(ctx);
  const guestName = typeof body.guestName === "string" ? body.guestName : "";
  const created = await createGuestSession(guestName);
  return jsonResponse({
    sessionId: created.sessionId,
    guestToken: created.guestToken,
    guestName: created.guestName,
    wsUrl: csWsUrl(),
  }, 201);
}
