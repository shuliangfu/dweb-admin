/**
 * 示例 API：hello
 * GET/POST /hello
 */

import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/**
 * GET /hello
 */
export function GET(_ctx: ApiContext) {
  return json({ message: "Hello from dweb API" });
}

/**
 * POST /hello
 * 文件路由 API 的唯一参数为 ApiContext（可用 ctx.body / ctx.req）
 */
export async function POST(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: "Created", data: body });
}
