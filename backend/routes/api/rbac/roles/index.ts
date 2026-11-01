/** Roles collection — dual: `index`/`create` + GET/POST. */
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("role");
export const index = h.list;
export const create = h.create;
export const GET = index;
export const POST = create;
