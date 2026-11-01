/** GET /api/rbac/roles (paginated; ?name=x → detail) · POST /api/rbac/roles (create). RBAC-protected. */
import type { ApiContext } from "@dreamer/dweb";
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("role");
export function GET(ctx: ApiContext) {
  return h.list(ctx);
}
export function POST(ctx: ApiContext) {
  return h.create(ctx);
}
