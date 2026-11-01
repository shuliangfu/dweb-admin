/**
 * Dual API export helpers for `@dreamer/router` / dweb.
 *
 * ## Two templates (framework-native; pick via `router.apiMode`)
 *
 * 1. **restful** (this app's default): export `GET` / `POST` / `PUT` / `DELETE` / `PATCH`.
 *    URL = file path. Example: `routes/api/users/index.ts` → `GET|POST /api/users`.
 *
 * 2. **action**: export the method name directly (`login`, `index`, `create`, …).
 *    Router also registers `…/:method` on static API files so
 *    `POST /api/auth/login` matches export `login` (see `@dreamer/server` RouterAdapter
 *    `params.method` / path-segment / kebab→camel).
 *
 * `apiMode` is **global** for an app (`backend/config/main.ts`); the router does not
 * mix modes per file. To keep either config working, **dual-export**: write the
 * action-named function as the source of truth, then alias the HTTP verb:
 *
 * ```ts
 * export async function login(ctx: ApiContext) { ... }
 * export const POST = login; // restful alias
 * ```
 *
 * One-handler-per-file paths (auth, kick, …) share the same URL under both modes.
 * Collection endpoints that distinguish verbs on one path (`GET`+`POST /api/users`)
 * are restful-first; under `apiMode: "action"` call `/api/users/create` (etc.) or
 * keep `apiMode: "restful"`. Dynamic `[id].ts` routes are restful-oriented.
 *
 * Reuses framework loading only — do not invent a second dispatcher.
 */
import type { ApiContext } from "@dreamer/dweb";

export type ApiHandler = (
  ctx: ApiContext,
) => Response | Promise<Response>;

export type HttpVerb = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Build a `{ VERB, actionName }` map for tests / composition.
 * Route modules should still `export function action` + `export const VERB = action`
 * so the file-based loader sees real named exports.
 */
export function dualExport<T extends ApiHandler>(
  verb: HttpVerb,
  actionName: string,
  handler: T,
): Record<string, T> {
  return { [verb]: handler, [actionName]: handler };
}
