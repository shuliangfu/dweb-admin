/** DELETE /api/sessions/:id — revoke an online admin session (kick). */
import type { ApiContext } from "@dreamer/dweb";
import { revokeSessionById } from "@common/service/auth.ts";
import { respond } from "@backend/api-util.ts";

export async function DELETE(ctx: ApiContext) {
  return respond(ctx.req, await revokeSessionById(String(ctx.params?.id ?? ""), ctx.req));
}
