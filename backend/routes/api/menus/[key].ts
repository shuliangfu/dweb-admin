/**
 * Menu by key — restful-oriented dynamic route; also exports action names for apiMode:"action"
 * when reached via a static :method layout. Preferred under restful: PUT|DELETE /api/menus/:key
 */
import type { ApiContext } from "@dreamer/dweb";
import { deleteMenu, updateMenu } from "@common/service/admin-crud.ts";
import { readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function update(ctx: ApiContext) {
  return respond(ctx.req, await updateMenu(String(ctx.params?.key ?? ""), await readBody(ctx)));
}

export async function remove(ctx: ApiContext) {
  return respond(ctx.req, await deleteMenu(String(ctx.params?.key ?? "")));
}

export const PUT = update;
export const DELETE = remove;
