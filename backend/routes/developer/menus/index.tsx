/** Resource page "menus" — top-level list + drill-down into children. */
import type { LoadContext } from "@dreamer/dweb";
import type { ResData } from "@backend/components/res-page.tsx";
import { MenusAdmin } from "@backend/components/MenusAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { resLoad } = await import("@backend/res-load.ts");
  return resLoad("menus")(ctx);
}

export default function Page(props: { data?: ResData } & ResData) {
  const d: ResData = props.data ?? props;
  if (!d.initial) return null;
  return <MenusAdmin locale={d.locale ?? "zh-CN"} initial={d.initial} />;
}
