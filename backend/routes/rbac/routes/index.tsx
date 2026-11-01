/** Managed routes + auto-scan. Route: /rbac/routes */
import type { LoadContext } from "@dreamer/dweb";
import type { ResData } from "@backend/components/res-page.tsx";
import { RoutesAdmin } from "@backend/components/RoutesAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { resLoad } = await import("@backend/res-load.ts");
  const base = await resLoad("routes")(ctx);
  const { listRoutes } = await import("@common/service/rbac-admin.ts");
  const r = await listRoutes();
  return { ...base, managed: r.managed, available: r.available };
}

type Data = ResData & { managed?: string[]; available?: string[] };

export default function Page(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  if (!d.initial) return null;
  return <RoutesAdmin locale={d.locale ?? "zh-CN"} initial={d.initial} managed={d.managed ?? []} available={d.available ?? []} />;
}
