/** PUT /api/rbac/permissions/:name/children — Transfer: { add: string[], remove: string[] } (keys like "route:GET /x"). */
import type { ApiContext } from "@dreamer/dweb";
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("permission");
export function PUT(ctx: ApiContext) {
  return h.children(ctx);
}
