/**
 * Sample API (api app, kind:"api") — demonstrates BOTH templates in one file.
 * restful: GET|POST /hello
 * action:  `hello` / `create` (also /hello/:method when apiMode is "action")
 */
import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

/** Action-style: export the method name directly. */
export function hello(_ctx: ApiContext) {
  return json({ message: "Hello from dweb API" });
}

export async function create(ctx: ApiContext) {
  const body = (ctx.body as Record<string, unknown> | undefined) ??
    await ctx.req.json().catch(() => ({}));
  return json({ message: "Created", data: body });
}

/** RESTful aliases (apiMode: "restful", default). */
export const GET = hello;
export const POST = create;
