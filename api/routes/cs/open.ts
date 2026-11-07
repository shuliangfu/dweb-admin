/**
 * Action `open` → /cs/open — guest creates a CS session.
 * Body required: { guestName: string } — phone OR email (contact gate).
 * Same contact reuses the canonical open session (no lobby dupes).
 * wsUrl follows X-Forwarded-Host when proxied (page origin /ws), else api public base.
 */
import type { ApiContext } from "@dreamer/dweb";
import { createGuestSession, publishCsSession } from "@common/service/cs.ts";
import { csWsUrl } from "@common/utils/cs-ws.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

export async function open(ctx: ApiContext) {
  const body = await readBody(ctx);
  const guestName = typeof body.guestName === "string" ? body.guestName : "";
  const created = await createGuestSession(guestName);
  if (!created.ok) {
    return jsonResponse({ error: "invalidContact", message: created.message }, 400);
  }
  const lobby = created.lobby ?? {
    id: created.sessionId,
    guestName: created.guestName,
    status: "open",
    lastPreview: "",
    updatedAt: new Date().toISOString(),
    online: false,
  };
  publishCsSession({
    ...lobby,
    // Fresh open: guest not on WS yet until they connect.
    online: false,
    updatedAt: lobby.updatedAt || new Date().toISOString(),
  });
  return jsonResponse({
    sessionId: created.sessionId,
    guestToken: created.guestToken,
    guestName: created.guestName,
    reused: created.reused === true,
    wsUrl: csWsUrl(ctx.req),
  }, created.reused ? 200 : 201);
}
