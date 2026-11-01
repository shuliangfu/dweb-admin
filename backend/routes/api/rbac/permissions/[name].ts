/** PUT (edit) · DELETE /api/rbac/permissions/:name. Detail GET is served by index.ts (?name=). RBAC-protected. */
import type { ApiContext } from "@dreamer/dweb";
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("permission");
export function PUT(ctx: ApiContext) {
  return h.update(ctx);
}
export function DELETE(ctx: ApiContext) {
  return h.remove(ctx);
}
