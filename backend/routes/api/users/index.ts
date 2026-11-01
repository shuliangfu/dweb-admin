/**
 * Action-mode list/index handler (apiMode: action).
 */
import type { ApiContext } from "@dreamer/dweb";
import { createUser, listUsers, readPage } from "@common/service/admin-crud.ts";
import { jsonResponse, readBody } from "@common/utils/http.ts";
import { respond } from "@backend/api-util.ts";

export async function index(ctx: ApiContext) {
  return jsonResponse(await listUsers(readPage(new URL(ctx.req.url))));
}

export async function create(ctx: ApiContext) {
  return respond(ctx.req, await createUser(await readBody(ctx)), 201);
}

