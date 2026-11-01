/**
 * 示例 API：用户列表
 * GET /users
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

/**
 * GET /users
 */
export function GET(_ctx: ApiContext) {
  return json({ users });
}
