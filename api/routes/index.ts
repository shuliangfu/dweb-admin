/**
 * API root sample (kind:"api", apiMode:"action").
 * File `index.ts` → route `/`. Export `index` is the default action for
 * `/index` (via `/:method`) and for `/api/<resource>` under web apps.
 * Bare `/` does NOT auto-dispatch `index` in @dreamer/server@1.2.1 — see handoff.
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

