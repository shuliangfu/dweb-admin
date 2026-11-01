/** Admin ↔ role assignment. Route: /rbac/assign */
import type { ResData } from "@backend/components/res-page.tsx";
import { AssignAdmin, type AssignRoleOpt } from "@backend/components/AssignAdmin.tsx";
import type { LoadContext } from "@dreamer/dweb";

export async function load(ctx: LoadContext) {
  const { resLoad } = await import("@backend/res-load.ts");
  const base = await resLoad("assign")(ctx);
  const { roleOptions } = await import("@common/service/rbac-admin.ts");
  return { ...base, roles: await roleOptions() };
}

type Data = ResData & { roles?: AssignRoleOpt[] };

export default function Page(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  if (!d.initial) return null;
  return <AssignAdmin locale={d.locale ?? "zh-CN"} initial={d.initial} roles={d.roles ?? []} />;
}
