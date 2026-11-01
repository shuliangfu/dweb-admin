/**
 * Own profile — dual exports for restful + action.
 * restful: GET|PUT /api/account/profile
 * action:  `profile` / `updateProfile` (+ /api/account/profile/:method)
 */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { getProfile, updateProfile as saveProfile } from "@common/service/security.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function profile(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  const data = await getProfile(me.id);
  return data ? jsonResponse(data) : jsonResponse({ error: "notFound" }, 404);
}

export async function updateProfile(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  return respond(ctx.req, await saveProfile(me.id, await readBody(ctx)));
}

