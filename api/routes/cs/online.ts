/**
 * Action `online` → GET/POST /cs/online — live guest presence ids in this api process.
 * Backend admin session list merges these so hard refresh shows green without waiting
 * for WS lobby snapshot (Mongo guestOnline can lag after boot reset / races).
 */
import type { ApiContext } from "@dreamer/dweb";
import { getCsOnlineGuestIds } from "@api/ws-chat.ts";
import { jsonResponse } from "@common/utils/http.ts";

export function online(_ctx: ApiContext) {
  return jsonResponse({
    ids: getCsOnlineGuestIds(),
    marker: "presence-live-v4",
  });
}
