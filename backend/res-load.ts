/** Server-only: SSR first-paint payload for a resource page. Always import dynamically from `load`. */
import type { LoadContext } from "@dreamer/dweb";
import { resolveLocale } from "@common/i18n/mod.ts";
import { getCurrentUser } from "@common/service/auth.ts";
import { loadPanel } from "@common/resources/mod.ts";

export function resLoad(key: string) {
  return async (ctx: LoadContext) => {
    const locale = resolveLocale(ctx.req);
    const user = await getCurrentUser(ctx.req);
    return {
      locale,
      initial: await loadPanel(key, ctx.req, locale, {
        id: user?.id ?? "",
        username: user?.username ?? "",
        roleCodes: user?.roleCodes ?? [],
        isSuper: !!user?.isSuper,
      }),
    };
  };
}
