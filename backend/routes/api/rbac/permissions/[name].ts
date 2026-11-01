/** Permission by name — dual: `update`/`remove` + PUT/DELETE. */
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("permission");
export const update = h.update;
export const remove = h.remove;
export const PUT = update;
export const DELETE = remove;
