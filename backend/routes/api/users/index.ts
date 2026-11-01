/** GET /api/users?page&pageSize&keyword (paginated) · POST /api/users (create). RBAC-protected. */
import type { ApiContext } from "@dreamer/dweb";
import { createUser, listUsers, readPage } from "@common/service/admin-crud.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function GET(ctx: ApiContext) {
  return jsonResponse(await listUsers(readPage(new URL(ctx.req.url))));
}

export async function POST(ctx: ApiContext) {
  return respond(ctx.req, await createUser(await readBody(ctx)), 201);
}
