/** Sidebar menu tree — dual: `mine` (action) + `GET` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { buildMenuTree } from "@common/service/menu.ts";
import { resolveLocale } from "@common/i18n/mod.ts";
import { jsonResponse } from "@common/utils/http.ts";

export async function mine(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  const locale = resolveLocale(ctx.req);
  return jsonResponse({ locale, menu: await buildMenuTree(user.roleCodes, locale) });
}

export const GET = mine;
