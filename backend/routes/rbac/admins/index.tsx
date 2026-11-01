/** Admin (user) list with Modal create/edit. Route: /rbac/admins */
import type { LoadContext } from "@dreamer/dweb";
import { type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { AdminsAdmin, type UserRow } from "@backend/components/AdminsAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { listUsers } = await import("@common/service/admin-crud.ts");
  const { roleOptions } = await import("@common/service/rbac-admin.ts");
  const keyword = new URL(ctx.req.url).searchParams.get("keyword") ?? "";
  const r = await listUsers({ page: 1, pageSize: 500, keyword });
  return {
    locale: resolveLocale(ctx.req),
    keyword,
    rows: r.items as UserRow[],
    roles: await roleOptions(),
  };
}

type Data = { locale?: Locale; keyword?: string; rows?: UserRow[]; roles?: { name: string; description: string }[] };

export default function Page(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  return (
    <AdminsAdmin locale={d.locale ?? "zh-CN"} rows={d.rows ?? []} roles={d.roles ?? []} keyword={d.keyword ?? ""} />
  );
}
