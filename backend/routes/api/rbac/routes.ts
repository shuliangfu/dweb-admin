/**
 * GET  /api/rbac/routes  — managed routes + freshly scanned (unmanaged) routes ("refresh")
 * POST /api/rbac/routes  — manual add: { routes: "GET /a, /b" }
 * PUT  /api/rbac/routes  — Transfer: { add: string[], remove: string[] } ("METHOD /path" keys)
 * RBAC-protected.
 */
import type { ApiContext } from "@dreamer/dweb";
import { addRoutes, listRoutes, parseRouteInput, removeRoutes } from "@common/service/rbac-admin.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function GET(_ctx: ApiContext) {
  return jsonResponse(await listRoutes());
}

export async function POST(ctx: ApiContext) {
  const keys = parseRouteInput(String((await readBody(ctx)).routes ?? ""));
  if (!keys) return respond(ctx.req, { ok: false, error: "routeInvalid" });
  return respond(ctx.req, await addRoutes(keys, "manual"), 201);
}

export async function PUT(ctx: ApiContext) {
  const b = await readBody(ctx);
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const add = await addRoutes(arr(b.add), "scan");
  if (!add.ok) return respond(ctx.req, add);
  return respond(ctx.req, await removeRoutes(arr(b.remove)));
}
