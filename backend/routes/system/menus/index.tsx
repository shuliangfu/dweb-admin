/** Menu definitions stored in the DB, Modal create/edit. Route: /system/menus */
import type { LoadContext } from "@dreamer/dweb";
import { type Locale, resolveLocale } from "@common/i18n/mod.ts";
import { type MenuRow, MenusAdmin } from "@backend/components/MenusAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { listAllMenus } = await import("@common/service/admin-crud.ts");
  return { locale: resolveLocale(ctx.req), rows: await listAllMenus() as MenuRow[] };
}

type Data = { locale?: Locale; rows?: MenuRow[] };

export default function MenusPage(props: { data?: Data } & Data) {
  const d: Data = props.data ?? props;
  return <MenusAdmin locale={d.locale ?? "zh-CN"} rows={d.rows ?? []} />;
}
