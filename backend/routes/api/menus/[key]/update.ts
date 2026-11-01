/** Action `update` (apiMode: "action"). */
import type { ApiContext } from "@dreamer/dweb";
import { deleteMenu, updateMenu } from "@common/service/admin-crud.ts";
import { readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function update(ctx: ApiContext) {
  return respond(ctx.req, await updateMenu(String(ctx.params?.key ?? ""), await readBody(ctx)));
}
