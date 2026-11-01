/**
 * Sample users list — action-mode `index` (apiMode:"action").
 * Paths: `/users`, `/users/index` (kind:api has no `/api` prefix).
 */
import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

export function index(_ctx: ApiContext) {
  return json({ users });
}
