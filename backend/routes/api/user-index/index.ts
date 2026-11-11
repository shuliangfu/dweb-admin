/**
 * Member list action API (`apiMode: action`, baseRoute `/api/user-index`).
 * Delegates to the existing `user.index` resource def. Distinct from
 * `/api/users`, which serves admin accounts.
 */
import type { ApiContext } from "@dreamer/dweb";
import { authorize, failResponse, isResponse } from "@backend/api-res.ts";
import { allRows, parseListQuery } from "@common/service/list.ts";

const KEY = "user.index";

export async function index(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "read");
  if (isResponse(a)) return a;
  const url = new URL(ctx.req.url);
  const q = parseListQuery(url.searchParams, a.def);
  const r = url.searchParams.get("export") === "1" ? await a.def.list(allRows(q)) : await a.def.list(q);
  if (!r.ok) return failResponse(a.locale, r);
  return Response.json(r.data);
}

export async function create(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const body = await ctx.req.json().catch(() => ({})) as Record<string, unknown>;
  if (Array.isArray((body as { rows?: unknown }).rows)) {
    const rows = (body as { rows: Record<string, unknown>[] }).rows;
    for (const row of rows) {
      const r = await a.def.create(row, a.ctx);
      if (!r.ok) return failResponse(a.locale, r);
    }
    return Response.json({ ok: true, count: rows.length }, { status: 201 });
  }
  const r = await a.def.create(body, a.ctx);
  if (!r.ok) return failResponse(a.locale, r);
  return Response.json(r.data, { status: 201 });
}

export async function update(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const body = await ctx.req.json().catch(() => ({})) as Record<string, unknown>;
  const r = await a.def.update(String(body.id ?? ""), body, a.ctx);
  if (!r.ok) return failResponse(a.locale, r);
  return Response.json(r.data);
}

export async function remove(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const body = await ctx.req.json().catch(() => ({})) as Record<string, unknown>;
  const r = await a.def.remove(String(body.id ?? ""), a.ctx);
  if (!r.ok) return failResponse(a.locale, r);
  return Response.json({ ok: true });
}
