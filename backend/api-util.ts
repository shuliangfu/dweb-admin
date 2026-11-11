/** Shared helpers for the CRUD API routes. */
import { createT, resolveLocale } from "@common/i18n/mod.ts";
import { errorStatus, jsonResponse, readBody } from "@common/utils/http.ts";
import type { Fail, Ok } from "@common/service/admin-crud.ts";

/** Turn a service result into a JSON response with a localized message. */
export function respond(
  request: Request,
  result: Ok | Fail,
  successStatus = 200,
): Response {
  if (result.ok) return jsonResponse({ ok: true }, successStatus);
  const tr = createT(resolveLocale(request));
  return jsonResponse(
    {
      error: result.error,
      message: tr(`apiError.${result.error}`),
      fields: result.fields ?? [],
    },
    errorStatus(result.error),
  );
}

// ---- role / permission handler factory (same endpoints, different item type) ----
import type { ApiContext } from "@dreamer/dweb";
import type { ItemType } from "@common/model/mod.ts";
import { readPage } from "@common/service/admin-crud.ts";
import {
  changeChildren,
  createItem,
  deleteItem,
  itemDetail,
  listItems,
  updateItem,
} from "@common/service/rbac-admin.ts";

function nameOf(ctx: ApiContext): string {
  const raw = String(ctx.params?.name ?? "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function itemHandlers(type: ItemType) {
  return {
    /**
     * GET collection. NOTE: this dweb/router version resolves `GET /x/<seg>` to the
     * collection's index handler (a `[name].ts` GET is never reached), so the detail
     * read is served here too: `?name=foo` or `/foo` returns detail + Transfer lists.
     */
    list: async (ctx: ApiContext) => {
      const url = new URL(ctx.req.url);
      const base = type === "role" ? "/api/rbac/roles" : "/api/rbac/permissions";
      const extra = url.pathname.startsWith(base + "/") ? url.pathname.slice(base.length + 1) : "";
      let name = url.searchParams.get("name") ?? extra;
      try {
        name = decodeURIComponent(name);
      } catch { /* keep raw */ }
      if (name) {
        const d = await itemDetail(type, name, resolveLocale(ctx.req));
        return d ? jsonResponse(d) : respond(ctx.req, { ok: false, error: "notFound" });
      }
      return jsonResponse(await listItems(type, readPage(url), resolveLocale(ctx.req)));
    },
    create: async (ctx: ApiContext) => respond(ctx.req, await createItem(type, await readBody(ctx)), 201),
    update: async (ctx: ApiContext) => respond(ctx.req, await updateItem(type, nameOf(ctx), await readBody(ctx))),
    remove: async (ctx: ApiContext) => respond(ctx.req, await deleteItem(type, nameOf(ctx))),
    children: async (ctx: ApiContext) => {
      const b = await readBody(ctx);
      const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
      return respond(ctx.req, await changeChildren(type, nameOf(ctx), arr(b.add), arr(b.remove)));
    },
  };
}
