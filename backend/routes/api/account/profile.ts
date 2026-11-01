/**
 * Own profile (auth-only path, any logged-in user):
 *   GET /api/account/profile  → { username, nickname, email, roleCodes }
 *   PUT /api/account/profile  → { nickname, email }   (validated; edits ONLY the session user)
 */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { getProfile, updateProfile } from "@common/service/security.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function GET(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  const profile = await getProfile(me.id);
  return profile ? jsonResponse(profile) : jsonResponse({ error: "notFound" }, 404);
}

export async function PUT(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  return respond(ctx.req, await updateProfile(me.id, await readBody(ctx)));
}
