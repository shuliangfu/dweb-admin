/**
 * Sample users list — dual: `index` (action) + `GET` (restful).
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

