/** Action `update` (apiMode: "action"). */
import type { ApiContext } from "@dreamer/dweb";
import { deleteUser, updateUser } from "@common/service/admin-crud.ts";
import { getCurrentUser } from "@common/service/auth.ts";
import { readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function update(ctx: ApiContext) {
  return respond(ctx.req, await updateUser(String(ctx.params?.id ?? ""), await readBody(ctx)));
}
