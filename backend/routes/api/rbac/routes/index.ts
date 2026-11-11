/**
 * Route list action API (`apiMode: action`, `/api/rbac/routes`).
 * GET lists via the `routes` resource (`{ rows, total }`).
 * POST create / update (body.id + method/path) / remove (body.ids) are the action verbs.
 * `sync` remains for the previous Transfer add/remove payload.
 */
import type { ApiContext } from "@dreamer/dweb";
import { authorize, failResponse, isResponse } from "@backend/api-res.ts";
import { respond } from "@backend/api-util.ts";
import {
  AuthItemChild,
  AuthRoute,
  type AuthRouteDocument,
  parseRouteKey,
  routeKey,
} from "@common/model/mod.ts";
import { invalidateRbacCache } from "@common/service/rbac.ts";
import { allRows, parseListQuery } from "@common/service/list.ts";
import {
  addRoutes,
  parseRouteInput,
  removeRoutes,
} from "@common/service/rbac-admin.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import type { Fail, Ok } from "@common/service/admin-crud.ts";

const KEY = "routes";

function keysFromBody(body: Record<string, unknown>): string[] | null {
  if (typeof body.routes === "string" && body.routes.trim()) {
    return parseRouteInput(body.routes);
  }
  const method = String(body.method ?? "").trim();
  const path = String(body.path ?? "").trim();
  if (method && path) return parseRouteInput(`${method} ${path}`);
  return null;
}

async function updateRoute(
  id: string,
  method: string,
  path: string,
): Promise<Ok | Fail> {
  const old = parseRouteKey(id);
  if (!old) return { ok: false, error: "routeInvalid" };
  const parsed = parseRouteKey(routeKey(method, path.trim()));
  if (!parsed) return { ok: false, error: "routeInvalid" };
  const existing = await AuthRoute.findOne({
    method: old.method,
    path: old.path,
  }) as AuthRouteDocument | null;
  if (!existing) return { ok: false, error: "notFound" };
  const oldKey = routeKey(old.method, old.path);
  const newKey = routeKey(parsed.method, parsed.path);
  if (oldKey === newKey) return { ok: true };
  if (
    await AuthRoute.findOne({ method: parsed.method, path: parsed.path })
  ) {
    return { ok: false, error: "itemExists" };
  }
  await AuthRoute.deleteMany({ method: old.method, path: old.path });
  await AuthRoute.create({
    method: parsed.method,
    path: parsed.path,
    source: existing.source,
    createdAt: existing.createdAt,
  });
  await AuthItemChild.updateMany(
    { childType: "route", child: oldKey },
    { $set: { child: newKey } },
  );
  await invalidateRbacCache();
  return { ok: true };
}

export async function index(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "read");
  if (isResponse(a)) return a;
  const url = new URL(ctx.req.url);
  const query = parseListQuery(url.searchParams, a.def);
  const q = url.searchParams.get("export") === "1" ? allRows(query) : query;
  const r = await a.def.list(q, a.ctx);
  return jsonResponse({ rows: r.rows, total: r.total, totals: r.totals });
}

export async function create(ctx: ApiContext) {
  const body = await readBody(ctx) as Record<string, unknown>;
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  if (body && Array.isArray(body.rows)) {
    const rows = body.rows as Record<string, unknown>[];
    let created = 0;
    for (const row of rows) {
      const keys = keysFromBody(row);
      if (!keys) continue;
      const r = await addRoutes(keys, "manual");
      if (r.ok) created++;
    }
    return jsonResponse(
      { created, failed: rows.length - created },
      created ? 201 : 400,
    );
  }
  const keys = keysFromBody(body);
  if (!keys) {
    return failResponse(a.locale, { ok: false, error: "routeInvalid" });
  }
  const r = await addRoutes(keys, "manual");
  return r.ok ? jsonResponse({ ok: true }, 201) : failResponse(a.locale, r);
}

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx) as Record<string, unknown>;
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const r = await updateRoute(
    String(body.id ?? ""),
    String(body.method ?? ""),
    String(body.path ?? ""),
  );
  return r.ok ? jsonResponse({ ok: true }) : failResponse(a.locale, r);
}

export async function remove(ctx: ApiContext) {
  const body = await readBody(ctx) as Record<string, unknown>;
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  if (!a.def.remove) {
    return failResponse(a.locale, { ok: false, error: "invalid" });
  }
  const ids = Array.isArray(body.ids)
    ? (body.ids as unknown[]).map(String).filter(Boolean).slice(0, 1000)
    : [];
  const r = await a.def.remove(ids, a.ctx);
  return jsonResponse({ removed: r.removed ?? 0, failed: r.failed ?? [] });
}

export async function sync(ctx: ApiContext) {
  const body = await readBody(ctx) as Record<string, unknown>;
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const add = await addRoutes(arr(body.add), "scan");
  if (!add.ok) return respond(ctx.req, add);
  return respond(ctx.req, await removeRoutes(arr(body.remove)));
}
