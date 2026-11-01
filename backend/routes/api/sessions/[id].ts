/** Kick session — dual: `remove` (action) + `DELETE` (restful). */
import type { ApiContext } from "@dreamer/dweb";
import { revokeSessionById } from "@common/service/auth.ts";
import { respond } from "@backend/api-util.ts";

export async function remove(ctx: ApiContext) {
  return respond(ctx.req, await revokeSessionById(String(ctx.params?.id ?? ""), ctx.req));
}

export const DELETE = remove;
