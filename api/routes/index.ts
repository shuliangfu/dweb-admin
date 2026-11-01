/**
 * API root sample (kind:"api", apiMode:"action").
 * File `index.ts` → route `/`. Export `index` is the default action for
 * bare `/`, `/index` (via `/:method`), and for `/api/<resource>` under web apps
 * (@dreamer/server@^1.2.2 apiOnly + `/api/<resource>` fallback).
 */
import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/** Action-style: export the method name directly. */
export function index(_ctx: ApiContext) {
  return json({ message: "Hello from dweb API (index)" });
}

export async function create(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: "Created", data: body });
}
