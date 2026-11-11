/**
 * Role-assignment list action API (`apiMode: action`, `/api/rbac/assign`).
 * GET lists via the `assign` resource (`{ rows, total }`).
 * GET `/api/rbac/assign/roles` returns assignable role options.
 * POST update saves `roleCodes` through the existing admin user update.
 */
import type { ApiContext } from "@dreamer/dweb";
import { authorize, failResponse, isResponse } from "@backend/api-res.ts";
import { allRows, parseListQuery } from "@common/service/list.ts";
import { updateUser } from "@common/service/admin-crud.ts";
import { roleOptions } from "@common/service/rbac-admin.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

const KEY = "assign";

export async function index(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "read");
  if (isResponse(a)) return a;
  const url = new URL(ctx.req.url);
  const query = parseListQuery(url.searchParams, a.def);
  const q = url.searchParams.get("export") === "1" ? allRows(query) : query;
  const r = await a.def.list(q, a.ctx);
  return jsonResponse({ rows: r.rows, total: r.total, totals: r.totals });
}

export async function roles(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "read");
  if (isResponse(a)) return a;
  return jsonResponse({ roles: await roleOptions(a.locale) });
}

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx) as Record<string, unknown>;
  /** Write is authorized as admins — `POST /api/res/admins` is seeded; `assign` is not. */
  const a = await authorize(ctx.req, "admins", "write");
  if (isResponse(a)) return a;
  const roleCodes = Array.isArray(body.roleCodes)
    ? (body.roleCodes as unknown[]).map(String)
    : [];
  const r = await updateUser(String(body.id ?? ""), { roleCodes });
  return r.ok ? jsonResponse({ ok: true }) : failResponse(a.locale, r);
}
