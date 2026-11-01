/**
 * Generic resource API (apiMode: action). Every list page talks to these actions:
 *   GET  /api/res?res=<key>&page&pageSize&sort&order&<filters>   list (server-side paging)
 *   GET  /api/res/get?res&id                                     one record
 *   GET  /api/res/download?res&format&cols&<filters>&sort        export ALL matching rows
 *   POST /api/res/create | update | remove | field | importRows  writes (JSON body, includes `res`)
 */
import type { ApiContext } from "@dreamer/dweb";
import { createT } from "@common/i18n/mod.ts";
import { allRows, parseListQuery } from "@common/service/list.ts";
import { buildExport, EXPORT_FORMATS, type ExportFormat } from "@common/service/export.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { pick } from "@common/resources/types.ts";
import { authorize, failResponse, isResponse } from "@backend/api-res.ts";

const urlOf = (ctx: ApiContext) => new URL(ctx.req.url);
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 1000) : []);

export async function index(ctx: ApiContext) {
  const url = urlOf(ctx);
  const a = await authorize(ctx.req, url.searchParams.get("res"), "read");
  if (isResponse(a)) return a;
  const query = parseListQuery(url.searchParams, a.def);
  const r = await a.def.list(query, a.ctx);
  return jsonResponse({ ...r, query });
}

export async function get(ctx: ApiContext) {
  const url = urlOf(ctx);
  const a = await authorize(ctx.req, url.searchParams.get("res"), "read");
  if (isResponse(a)) return a;
  const row = a.def.get ? await a.def.get(url.searchParams.get("id") ?? "", a.ctx) : null;
  if (!row) return failResponse(a.locale, { ok: false, error: "notFound" });
  return jsonResponse({ row });
}

export async function download(ctx: ApiContext) {
  const url = urlOf(ctx);
  const a = await authorize(ctx.req, url.searchParams.get("res"), "read");
  if (isResponse(a)) return a;
  const fmt = (url.searchParams.get("format") ?? "xlsx") as ExportFormat;
  if (!EXPORT_FORMATS.includes(fmt)) return failResponse(a.locale, { ok: false, error: "invalid" });
  const q = allRows(parseListQuery(url.searchParams, a.def));
  const r = await a.def.list(q, a.ctx);
  const wanted = (url.searchParams.get("cols") ?? "").split(",").filter(Boolean);
  const cols = a.def.columns.filter((c) => !c.noExport && (wanted.length === 0 || wanted.includes(c.prop)));
  const tr = createT(a.locale);
  return await buildExport({
    format: fmt,
    title: pick(a.def.title, a.locale),
    basename: a.def.key,
    columns: cols.length ? cols : a.def.columns,
    rows: r.rows,
    locale: a.locale,
    totals: r.totals,
    totalLabel: tr("panel.total"),
  });
}

export async function create(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, body.res, "write");
  if (isResponse(a)) return a;
  if (!a.def.create) return failResponse(a.locale, { ok: false, error: "invalid" });
  const r = await a.def.create(body, a.ctx);
  return r.ok ? jsonResponse({ ok: true }, 201) : failResponse(a.locale, r);
}

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, body.res, "write");
  if (isResponse(a)) return a;
  if (!a.def.update) return failResponse(a.locale, { ok: false, error: "invalid" });
  const r = await a.def.update(String(body.id ?? ""), body, a.ctx);
  return r.ok ? jsonResponse({ ok: true }) : failResponse(a.locale, r);
}

/** Bulk/single delete. The client always asks for confirmation before calling this. */
export async function remove(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, body.res, "write");
  if (isResponse(a)) return a;
  if (!a.def.remove) return failResponse(a.locale, { ok: false, error: "invalid" });
  const list = ids(body.ids);
  if (!list.length) return failResponse(a.locale, { ok: false, error: "invalid" });
  const r = await a.def.remove(list, a.ctx);
  return jsonResponse({ ok: r.failed.length === 0, ...r }, r.removed || !r.failed.length ? 200 : 409);
}

/** Set one field on rows: inline edit (1 id) and batch status (many ids). */
export async function field(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, body.res, "write");
  if (isResponse(a)) return a;
  if (!a.def.setField) return failResponse(a.locale, { ok: false, error: "invalid" });
  const list = ids(body.ids ?? (body.id ? [body.id] : []));
  const f = String(body.field ?? "");
  if (!list.length || !f) return failResponse(a.locale, { ok: false, error: "invalid" });
  const r = await a.def.setField(list, f, body.value, a.ctx);
  return jsonResponse({ ok: r.failed.length === 0, ...r }, r.removed || !r.failed.length ? 200 : 409);
}

export async function importRows(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, body.res, "write");
  if (isResponse(a)) return a;
  if (!a.def.importRows) return failResponse(a.locale, { ok: false, error: "invalid" });
  const rows = Array.isArray(body.rows) ? (body.rows as Record<string, string>[]).slice(0, 2000) : [];
  const r = await a.def.importRows(rows, a.ctx);
  return jsonResponse({ ok: true, ...r });
}
