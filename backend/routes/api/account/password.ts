/** POST /api/account/password — { oldPassword, newPassword }; verifies the old password. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser, readToken } from "@common/service/auth.ts";
import { changePassword } from "@common/service/security.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function POST(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  return respond(ctx.req, await changePassword(me.id, readToken(ctx.req), await readBody(ctx)));
}
