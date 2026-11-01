/** role list (Yii2 style RBAC) — server-side list; bespoke detail modal with Transfer. */
import type { LoadContext } from "@dreamer/dweb";
import type { ResData } from "@backend/components/res-page.tsx";
import { ItemAdmin } from "@backend/components/ItemAdmin.tsx";

export async function load(ctx: LoadContext) {
  const { resLoad } = await import("@backend/res-load.ts");
  return resLoad("roles")(ctx);
}

export default function Page(props: { data?: ResData } & ResData) {
  const d: ResData = props.data ?? props;
  if (!d.initial) return null;
  return <ItemAdmin kind="role" locale={d.locale ?? "zh-CN"} initial={d.initial} />;
}
