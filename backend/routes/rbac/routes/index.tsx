/** Managed routes + auto-scan. Route: /rbac/routes */
import type { LoadContext } from "@dreamer/dweb";
import { type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { RoutesAdmin, type ManagedRouteRow } from "@backend/components/RoutesAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { listRoutes } = await import("@common/service/rbac-admin.ts");
  return { locale: resolveLocale(ctx.req), ...(await listRoutes()) };
}

type Data = {
  locale?: Locale;
  managed?: string[];
  available?: string[];
  managedDetail?: ManagedRouteRow[];
};

export default function Page(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  return (
    <RoutesAdmin
      locale={d.locale ?? "zh-CN"}
      managed={d.managed ?? []}
      available={d.available ?? []}
      managedDetail={d.managedDetail ?? []}
    />
  );
}
