/** Resource page "admins" — server-side list via the generic DataPanel. */
import type { LoadContext } from "@dreamer/dweb";
import { ResPage } from "@backend/components/res-page.tsx";

export async function load(ctx: LoadContext) {
  const { resLoad } = await import("@backend/res-load.ts");
  return resLoad("admins")(ctx);
}

export default ResPage;
