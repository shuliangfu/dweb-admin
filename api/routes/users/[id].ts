/**
 * 示例 API：用户详情
 * GET /users/:id
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

const users: Record<string, { id: string; name: string }> = {
  "1": { id: "1", name: "Alice" },
  "2": { id: "2", name: "Bob" },
};

/**
 * GET /users/:id
 */
export function GET(ctx: ApiContext) {
  const id = ctx.params?.id ?? "";
  const user = users[id];
  if (!user) {
    return json({ error: "not_found", id }, 404);
  }
  return json({ user });
}
