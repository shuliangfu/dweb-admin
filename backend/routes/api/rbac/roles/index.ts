/** roles collection (action mode): GET /api/rbac/roles (list or ?name= detail), POST /api/rbac/roles/create. */
import type { ApiContext } from "@dreamer/dweb";
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("role");

export async function index(ctx: ApiContext) {
  try { return await h.list(ctx); } catch (e) { return new Response(String((e as Error).stack), { status: 599 }); }
}

export async function create(ctx: ApiContext) {
  return await h.create(ctx);
}
