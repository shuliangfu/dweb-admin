/** Shared plumbing of the generic resource API (/api/res/*): auth, grants, error mapping. */
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { getCurrentUser } from "@common/service/auth.ts";
import { canAccessStrict } from "@common/service/rbac.ts";
import { getResource } from "@common/resources/mod.ts";
import type { Ctx, Fail, ResourceDef } from "@common/resources/types.ts";
import { errorStatus, jsonResponse } from "@common/utils/http.ts";

export type Action = "read" | "write";

export interface Authorized {
  def: ResourceDef;
  ctx: Ctx;
  locale: Locale;
}

/**
 * Resolve the resource and check the grant. Read: GET on the page path or on /api/res/<key>.
 * Write: POST on /api/res/<key> (super admins always pass).
 */
export async function authorize(req: Request, key: unknown, action: Action): Promise<Authorized | Response> {
  const locale = resolveLocale(req);
  const tr = createT(locale);
  const def = typeof key === "string" ? getResource(key) : undefined;
  if (!def) return jsonResponse({ error: "notFound", message: tr("apiError.notFound") }, 404);
  const user = await getCurrentUser(req);
  if (!user) return jsonResponse({ error: "unauthorized", message: tr("error.unauthorized") }, 401);
  const ok = user.isSuper ||
    (action === "read"
      ? await canAccessStrict(user.roleCodes, "GET", def.path) ||
        await canAccessStrict(user.roleCodes, "GET", `/api/res/${def.key}`)
      : await canAccessStrict(user.roleCodes, "POST", `/api/res/${def.key}`));
  if (!ok) return jsonResponse({ error: "forbidden", message: tr("error.forbidden") }, 403);
  return { def, locale, ctx: { request: req, locale, userId: user.id, username: user.username } };
}

export function isResponse(v: unknown): v is Response {
  return v instanceof Response;
}

/** Service failure → localized JSON with field-level messages. */
export function failResponse(locale: Locale, r: Fail): Response {
  const tr = createT(locale);
  return jsonResponse(
    {
      error: r.error,
      message: r.messages && Object.keys(r.messages).length ? tr("form.invalid") : tr(`apiError.${r.error}`),
      fields: r.fields ?? [],
      messages: r.messages ?? {},
    },
    errorStatus(r.error),
  );
}
