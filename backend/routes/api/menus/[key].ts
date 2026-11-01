/** PUT /api/menus/:key · DELETE /api/menus/:key. RBAC-protected. */
import type { ApiContext } from "@dreamer/dweb";
import { deleteMenu, updateMenu } from "@common/service/admin-crud.ts";
import { readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function PUT(ctx: ApiContext) {
  return respond(ctx.req, await updateMenu(String(ctx.params?.key ?? ""), await readBody(ctx)));
}

export async function DELETE(ctx: ApiContext) {
  return respond(ctx.req, await deleteMenu(String(ctx.params?.key ?? "")));
}
