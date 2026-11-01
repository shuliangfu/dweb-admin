/** GET /api/rbac/permissions (paginated; ?name=x → detail) · POST /api/rbac/permissions (create). RBAC-protected. */
import type { ApiContext } from "@dreamer/dweb";
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("permission");
export function GET(ctx: ApiContext) {
  return h.list(ctx);
}
export function POST(ctx: ApiContext) {
  return h.create(ctx);
}
