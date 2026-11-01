/** GET /api/menus (all rows, flat) · POST /api/menus (create). RBAC-protected. */
import type { ApiContext } from "@dreamer/dweb";
import { createMenu, listAllMenus } from "@common/service/admin-crud.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function GET(_ctx: ApiContext) {
  return jsonResponse({ items: await listAllMenus() });
}

export async function POST(ctx: ApiContext) {
  return respond(ctx.req, await createMenu(await readBody(ctx)), 201);
}
