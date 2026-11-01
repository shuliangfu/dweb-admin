/**
 * Managed routes registry — dual exports.
 * restful: GET|POST|PUT /api/rbac/routes
 * action:  `index` / `create` / `sync` (+ /api/rbac/routes/:method)
 */
import type { ApiContext } from "@dreamer/dweb";
import { addRoutes, listRoutes, parseRouteInput, removeRoutes } from "@common/service/rbac-admin.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function index(_ctx: ApiContext) {
  return jsonResponse(await listRoutes());
}

export async function create(ctx: ApiContext) {
  const keys = parseRouteInput(String((await readBody(ctx)).routes ?? ""));
  if (!keys) return respond(ctx.req, { ok: false, error: "routeInvalid" });
  return respond(ctx.req, await addRoutes(keys, "manual"), 201);
}

export async function sync(ctx: ApiContext) {
  const b = await readBody(ctx);
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const add = await addRoutes(arr(b.add), "scan");
  if (!add.ok) return respond(ctx.req, add);
  return respond(ctx.req, await removeRoutes(arr(b.remove)));
}

