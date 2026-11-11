/**
 * Users collection (apiMode: "action", `/api/users`).
 * Named exports are the actions (router registers /api/users/:method):
 *   GET  /api/users
 *   POST /api/users/create
 *   POST /api/users/update  (body includes id)
 *   POST /api/users/remove  (body { ids } or { id })
 */
import type { ApiContext } from "@dreamer/dweb";
import {
  createUser,
  deleteUser,
  listUsers,
  readPage,
  updateUser,
} from "@common/service/admin-crud.ts";
import { getCurrentUser } from "@common/service/auth.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

function idsOf(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.ids)) {
    return body.ids.map(String).filter(Boolean).slice(0, 1000);
  }
  const one = String(body.id ?? "");
  return one ? [one] : [];
}

export async function index(ctx: ApiContext) {
  return jsonResponse(await listUsers(readPage(new URL(ctx.req.url))));
}

export async function create(ctx: ApiContext) {
  return respond(ctx.req, await createUser(await readBody(ctx)), 201);
}

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx);
  return respond(ctx.req, await updateUser(String(body.id ?? ""), body));
}

export async function remove(ctx: ApiContext) {
  const body = await readBody(ctx);
  const me = await getCurrentUser(ctx.req);
  const ids = idsOf(body);
  if (ids.length <= 1) {
    return respond(ctx.req, await deleteUser(ids[0] ?? "", me?.id ?? ""));
  }
  const failed: string[] = [];
  let removed = 0;
  for (const id of ids) {
    const r = await deleteUser(id, me?.id ?? "");
    if (r.ok) removed++;
    else failed.push(id);
  }
  return jsonResponse({ removed, failed });
}
