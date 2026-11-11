/**
 * Active-member list action API (`apiMode: action`, `/api/user/active`).
 * Delegates to the existing `user.active` resource def. Distinct from `/api/users`.
 * Same collection as `user.index`, extraWhere status=active.
 */
import type { ApiContext } from "@dreamer/dweb";
import { authorize, failResponse, isResponse } from "@backend/api-res.ts";
import { allRows, parseListQuery } from "@common/service/list.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

const KEY = "user.active";

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
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  if (!a.def.create) {
    return failResponse(a.locale, { ok: false, error: "invalid" });
  }
  if (
    body && typeof body === "object" &&
    Array.isArray((body as { rows?: unknown }).rows)
  ) {
    const rows = (body as { rows: Record<string, unknown>[] }).rows;
    let created = 0;
    for (const row of rows) {
      const r = await a.def.create(row, a.ctx);
      if (r.ok) created++;
    }
    return jsonResponse(
      { created, failed: rows.length - created },
      created ? 201 : 400,
    );
  }
  const r = await a.def.create(body, a.ctx);
  return r.ok ? jsonResponse({ ok: true }, 201) : failResponse(a.locale, r);
}

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  if (!a.def.update) {
    return failResponse(a.locale, { ok: false, error: "invalid" });
  }
  const r = await a.def.update(String(body.id ?? ""), body, a.ctx);
  return r.ok ? jsonResponse({ ok: true }) : failResponse(a.locale, r);
}

export async function remove(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  if (!a.def.remove) {
    return failResponse(a.locale, { ok: false, error: "invalid" });
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.map(String).filter(Boolean).slice(0, 1000)
    : [];
  const r = await a.def.remove(ids, a.ctx);
  return jsonResponse({ removed: r.removed ?? 0, failed: r.failed ?? [] });
}
