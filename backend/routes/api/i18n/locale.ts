/**
 * Set locale cookie — dual: `locale` (action) + `GET` (restful).
 * Public. `redirect` must be a same-site absolute path (open-redirect safe).
 */
import type { ApiContext } from "@dreamer/dweb";
import { DEFAULT_LOCALE, localeCookie, normalizeLocale } from "@common/i18n/mod.ts";

export function locale(ctx: ApiContext) {
  const url = new URL(ctx.req.url);
  const loc = normalizeLocale(url.searchParams.get("lang")) ?? DEFAULT_LOCALE;
  const redirect = url.searchParams.get("redirect") ?? "/";
  const safe = redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\")
    ? redirect
    : "/";
  return new Response(null, {
    status: 302,
    headers: { Location: safe, "Set-Cookie": localeCookie(loc) },
  });
}

