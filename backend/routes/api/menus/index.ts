/**
 * Menus collection (apiMode: "action", `/api/menus`).
 * Named exports are the actions (router registers /api/menus/:method):
 *   GET  /api/menus
 *   POST /api/menus/create
 *   POST /api/menus/update  (body includes id or key)
 *   POST /api/menus/remove  (body { ids } or { id } or { key })
 * `/api/menus/mine` stays in mine.ts.
 */
import type { ApiContext } from "@dreamer/dweb";
import {
  createMenu,
  deleteMenu,
  listAllMenus,
  updateMenu,
} from "@common/service/admin-crud.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

function keysOf(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.ids)) {
    return body.ids.map(String).filter(Boolean).slice(0, 1000);
  }
  const one = String(body.id ?? body.key ?? "");
  return one ? [one] : [];
}

export async function index(_ctx: ApiContext) {
  return jsonResponse({ items: await listAllMenus() });
}

export async function create(ctx: ApiContext) {
  return respond(ctx.req, await createMenu(await readBody(ctx)), 201);
}

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx);
  return respond(
    ctx.req,
    await updateMenu(String(body.id ?? body.key ?? ""), body),
  );
}

export async function remove(ctx: ApiContext) {
  const body = await readBody(ctx);
  const keys = keysOf(body);
  if (keys.length <= 1) {
    return respond(ctx.req, await deleteMenu(keys[0] ?? ""));
  }
  const failed: string[] = [];
  let removed = 0;
  for (const key of keys) {
    const r = await deleteMenu(key);
    if (r.ok) removed++;
    else failed.push(key);
  }
  return jsonResponse({ removed, failed });
}
