/** PUT /api/users/:id (update) · DELETE /api/users/:id. RBAC-protected. */
import type { ApiContext } from "@dreamer/dweb";
import { deleteUser, updateUser } from "@common/service/admin-crud.ts";
import { getCurrentUser } from "@common/service/auth.ts";
import { readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function PUT(ctx: ApiContext) {
  return respond(ctx.req, await updateUser(String(ctx.params?.id ?? ""), await readBody(ctx)));
}

export async function DELETE(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  return respond(ctx.req, await deleteUser(String(ctx.params?.id ?? ""), me?.id ?? ""));
}
