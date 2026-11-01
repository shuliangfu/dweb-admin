/** permissions list (Yii2 style RBAC). Route: /rbac/permissions */
import type { LoadContext } from "@dreamer/dweb";
import { type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { ItemAdmin, type ItemRow } from "@backend/components/ItemAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { listItems } = await import("@common/service/rbac-admin.ts");
  const url = new URL(ctx.req.url);
  const keyword = url.searchParams.get("keyword") ?? "";
  const name = url.searchParams.get("name") ?? "";
  const info = url.searchParams.get("info") ?? "";
  const r = await listItems("permission", { page: 1, pageSize: 500, keyword, name, info });
  return {
    locale: resolveLocale(ctx.req),
    keyword,
    nameQ: name,
    infoQ: info,
    rows: r.items as ItemRow[],
  };
}

type Data = {
  locale?: Locale;
  keyword?: string;
  nameQ?: string;
  infoQ?: string;
  rows?: ItemRow[];
};

export default function Page(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  return (
    <ItemAdmin
      kind="permission"
      locale={d.locale ?? "zh-CN"}
      rows={d.rows ?? []}
      keyword={d.keyword ?? ""}
      nameQ={d.nameQ ?? ""}
      infoQ={d.infoQ ?? ""}
    />
  );
}
