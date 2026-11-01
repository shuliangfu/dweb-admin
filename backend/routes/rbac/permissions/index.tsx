/** permissions list (Yii2 style RBAC). Route: /rbac/permissions */
import type { LoadContext } from "@dreamer/dweb";
import { type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ItemAdmin, type ItemRow } from "@backend/components/ItemAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { listItems } = await import("@common/service/rbac-admin.ts");
  const keyword = new URL(ctx.req.url).searchParams.get("keyword") ?? "";
  const r = await listItems("permission", { page: 1, pageSize: 500, keyword });
  return { locale: resolveLocale(ctx.req), keyword, rows: r.items as ItemRow[] };
}

type Data = { locale?: Locale; keyword?: string; rows?: ItemRow[] };

export default function Page(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  return <ItemAdmin kind="permission" locale={d.locale ?? "zh-CN"} rows={d.rows ?? []} keyword={d.keyword ?? ""} />;
}
