/**
 * Admins collection (apiMode: "action"), aligned with the page route /rbac/admins.
 * Named exports on this file are the actions (router registers /api/rbac/admins/:method):
 *   GET  /api/rbac/admins
 *   POST /api/rbac/admins/create   (single object; or { rows } for import)
 *   POST /api/rbac/admins/update   (body includes id)
 *   POST /api/rbac/admins/remove   (body { ids })
 *   POST /api/rbac/admins/password (body { id, password, password2 })
 */
import type { ApiContext } from "@dreamer/dweb";
import { parseListQuery } from "@common/service/list.ts";
import { updateUser } from "@common/service/admin-crud.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { authorize, failResponse, isResponse } from "@backend/api-res.ts";
import {
  isWeakPassword,
  WEAK_PASSWORD_MESSAGE,
} from "@common/utils/password-strength.ts";

const KEY = "admins";

export async function index(ctx: ApiContext) {
  const a = await authorize(ctx.req, KEY, "read");
  if (isResponse(a)) return a;
  const query = parseListQuery(new URL(ctx.req.url).searchParams, a.def);
  const r = await a.def.list(query, a.ctx);
  return jsonResponse({ rows: r.rows, total: r.total, totals: r.totals });
}

export async function create(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  if (!a.def.create) {
    return failResponse(a.locale, { ok: false, error: "invalid" });
  }
  // Official action import: same create endpoint, body { rows } vs a single object.
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

export async function password(ctx: ApiContext) {
  const body = await readBody(ctx);
  const a = await authorize(ctx.req, KEY, "write");
  if (isResponse(a)) return a;
  const pwd = String(body.password ?? "");
  const messages: Record<string, string> = {};
  if (!pwd || pwd.length < 6 || pwd.length > 64) {
    messages.password = "请输入 6～64 位密码";
  } else if (isWeakPassword(pwd)) messages.password = WEAK_PASSWORD_MESSAGE;
  if (pwd !== String(body.password2 ?? "")) {
    messages.password2 = "两次密码不一致";
  }
  if (Object.keys(messages).length) {
    return failResponse(a.locale, {
      ok: false,
      error: "invalid",
      fields: Object.keys(messages),
      messages,
    });
  }
  const r = await updateUser(String(body.id ?? ""), { password: pwd });
  return r.ok ? jsonResponse({ ok: true }) : failResponse(a.locale, r);
}
