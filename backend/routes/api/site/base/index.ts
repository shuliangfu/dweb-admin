/** Action `update` — save the sidebar name from 基本设置. */
import type { ApiContext } from "@dreamer/dweb";
import { saveSiteBrand } from "@common/service/site.ts";
import { readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function update(ctx: ApiContext) {
  const body = await readBody(ctx);
  return respond(
    ctx.req,
    await saveSiteBrand(
      String(body.website ?? ""),
      String(body.shortName ?? ""),
    ),
  );
}
