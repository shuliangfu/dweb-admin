/** Role children Transfer — dual: `children` + PUT. */
import { itemHandlers } from "@backend/api-util.ts";

const h = itemHandlers("role");
export const children = h.children;
export const PUT = children;
