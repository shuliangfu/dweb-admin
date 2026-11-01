/**
 * Users collection — dual exports.
 * restful (default): GET|POST /api/users
 * action: `index` / `create` via /api/users/index/:method or /api/users/:method on a flat file
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

export const GET = index;
export const POST = create;
