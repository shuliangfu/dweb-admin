/** POST /api/account/passkeys/register — enrol step 2: { response, name }. */
import type { ApiContext } from "@dreamer/dweb";
import { getCurrentUser } from "@common/service/auth.ts";
import { passkeyRegisterVerify } from "@common/service/security.ts";
import { readChallengeToken } from "@common/service/challenge.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function POST(ctx: ApiContext) {
  const me = await getCurrentUser(ctx.req);
  if (!me) return jsonResponse({ error: "unauthorized" }, 401);
  const b = await readBody(ctx);
  return respond(
    ctx.req,
    await passkeyRegisterVerify(me.id, ctx.req, readChallengeToken(ctx.req), b.response as never, String(b.name ?? "")),
  );
}
