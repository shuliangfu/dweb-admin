/** Menu definitions stored in the DB, Modal create/edit. Route: /developer/menus */
import type { LoadContext } from "@dreamer/dweb";
import { type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { type MenuRow, MenusAdmin } from "@backend/components/MenusAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { listAllMenus } = await import("@common/service/admin-crud.ts");
  const sp = new URL(ctx.req.url).searchParams;
  const keyword = (sp.get("keyword") ?? "").trim().toLowerCase();
  const pathQ = (sp.get("path") ?? "").trim().toLowerCase();
  let rows = await listAllMenus() as MenuRow[];
  if (keyword) {
    rows = rows.filter((m) =>
      m.key.toLowerCase().includes(keyword) ||
      JSON.stringify(m.title ?? {}).toLowerCase().includes(keyword)
    );
  }
  if (pathQ) {
    rows = rows.filter((m) => (m.path ?? "").toLowerCase().includes(pathQ));
  }
  return {
    locale: resolveLocale(ctx.req),
    rows,
    keyword: sp.get("keyword") ?? "",
    path: sp.get("path") ?? "",
  };
}

type Data = { locale?: Locale; rows?: MenuRow[]; keyword?: string; path?: string };

export default function MenusPage(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  return (
    <MenusAdmin
      locale={d.locale ?? "zh-CN"}
      rows={d.rows ?? []}
      keyword={d.keyword ?? ""}
      path={d.path ?? ""}
    />
  );
}
