/** Admin ↔ role assignment. Route: /rbac/assign — Vue admin/assign. */
import type { LoadContext } from "@dreamer/dweb";
import { type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { AssignAdmin, type AssignUserRow } from "@backend/components/AssignAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { listUsers } = await import("@common/service/admin-crud.ts");
  const { roleOptions } = await import("@common/service/rbac-admin.ts");
  const url = new URL(ctx.req.url);
  const keyword = url.searchParams.get("keyword") ?? "";
  const email = url.searchParams.get("email") ?? "";
  const r = await listUsers({ page: 1, pageSize: 500, keyword });
  let rows = r.items as AssignUserRow[];
  if (email.trim()) {
    const q = email.trim().toLowerCase();
    rows = rows.filter((u) => (u.email ?? "").toLowerCase().includes(q));
  }
  return {
    locale: resolveLocale(ctx.req),
    keyword,
    email,
    rows,
    roles: await roleOptions(),
  };
}

type Data = {
  locale?: Locale;
  keyword?: string;
  email?: string;
  rows?: AssignUserRow[];
  roles?: { name: string; description: string }[];
};

export default function Page(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  return (
    <AssignAdmin
      locale={d.locale ?? "zh-CN"}
      rows={d.rows ?? []}
      roles={d.roles ?? []}
      keyword={d.keyword ?? ""}
      email={d.email ?? ""}
    />
  );
}
