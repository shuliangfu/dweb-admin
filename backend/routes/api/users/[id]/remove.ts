/** Action `remove` (apiMode: "action"). */
import type { ApiContext } from "@dreamer/dweb";
import { deleteUser, updateUser } from "@common/service/admin-crud.ts";
import { getCurrentUser } from "@common/service/auth.ts";
import { readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function remove(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  return respond(ctx.req, await deleteUser(String(ctx.params?.id ?? ""), me?.id ?? ""));
}

