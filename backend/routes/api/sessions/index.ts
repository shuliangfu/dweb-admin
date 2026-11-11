/**
 * Admin login-session actions (`apiMode: action`, `/api/sessions`).
 * POST /api/sessions/remove  body { id } or { ids }
 */
import type { ApiContext } from "@dreamer/dweb";
import { revokeSessionById } from "@common/service/auth.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

function idsOf(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.ids)) {
    return body.ids.map(String).filter(Boolean).slice(0, 1000);
  }
  const one = String(body.id ?? "");
  return one ? [one] : [];
}

export async function remove(ctx: ApiContext) {
  const body = await readBody(ctx);
  const ids = idsOf(body);
  if (ids.length <= 1) {
    return respond(ctx.req, await revokeSessionById(ids[0] ?? "", ctx.req));
  }
  const failed: string[] = [];
  let removed = 0;
  for (const id of ids) {
    const r = await revokeSessionById(id, ctx.req);
    if (r.ok) removed++;
    else failed.push(id);
  }
  return jsonResponse({ removed, failed });
}
