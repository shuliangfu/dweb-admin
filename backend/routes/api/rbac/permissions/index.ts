/** permissions collection (action mode): GET /api/rbac/permissions (list or ?name= detail), POST /api/rbac/permissions/create. */
import type { ApiContext } from "@dreamer/dweb";
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("permission");

export async function index(ctx: ApiContext) {
  return await h.list(ctx);
}

export async function create(ctx: ApiContext) {
  return await h.create(ctx);
}
