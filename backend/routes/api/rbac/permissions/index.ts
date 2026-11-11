/**
 * Permission list action API (`apiMode: action`, `/api/rbac/permissions`).
 * GET without a detail name lists via the `permissions` resource (`{ rows, total }`).
 * GET `?name=` (and no page/pageSize) still returns Transfer detail for assign.
 * POST create / update (body.id) / remove (body.ids) / children (body.name, add, remove).
 */
import type { ApiContext } from "@dreamer/dweb";
import { authorize, failResponse, isResponse } from "@backend/api-res.ts";
import { respond } from "@backend/api-util.ts";
import { resolveLocale } from "@common/i18n/mod.ts";
import { allRows, parseListQuery } from "@common/service/list.ts";
import {
  changeChildren,
  createItem,
  itemDetail,
  updateItem,
} from "@common/service/rbac-admin.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";

const KEY = "permissions";

/** Detail intent: `?name=` without list pagination (assign Modal). */
function detailName(ctx: ApiContext): string {
  const url = new URL(ctx.req.url);
  if (
    url.searchParams.has("page") || url.searchParams.has("pageSize") ||
    url.searchParams.get("export") === "1"
  ) {
    return "";
  }
  let name = (url.searchParams.get("name") ?? "").trim();
  if (!name) return "";
  try {
    name = decodeURIComponent(name);
  } catch { /* keep raw */ }
  return name;
}

export async function index(ctx: ApiContext) {
  const name = detailName(ctx);
  if (name) {
    const a = await authorize(ctx.req, KEY, "read");
    if (isResponse(a)) return a;
    const d = await itemDetail("permission", name, resolveLocale(ctx.req));
    return d
      ? jsonResponse(d)
      : respond(ctx.req, { ok: false, error: "notFound" });
  }
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
  if (
    body && typeof body === "object" &&
    Array.isArray((body as { rows?: unknown }).rows)
  ) {
    const rows = (body as { rows: Record<string, unknown>[] }).rows;
    let created = 0;
    for (const row of rows) {
      const r = await createItem("permission", row);
      if (r.ok) created++;
    }
    return jsonResponse(
      { created, failed: rows.length - created },
      created ? 201 : 400,
    );
  }
  const r = await createItem("permission", body);
  return r.ok ? jsonResponse({ ok: true }, 201) : failResponse(a.locale, r);
}

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const r = await updateItem(
    "permission",
    String(body.id ?? body.name ?? ""),
    body,
  );
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

export async function children(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const name = String(body.id ?? body.name ?? "");
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const r = await changeChildren(
    "permission",
    name,
    arr(body.add),
    arr(body.remove),
  );
  return r.ok ? jsonResponse({ ok: true }) : failResponse(a.locale, r);
}
