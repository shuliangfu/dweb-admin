/**
 * API style for `@dreamer/router` / dweb — **action mode only** in this app.
 *
 * Config: `router.apiMode: "action"` in `backend/config/main.ts` and `api/config/main.ts`
 * (global per app; cannot mix with restful per file).
 *
 * ## How to write handlers
 *
 * Export the **action name** as a function (or const). Do **not** export
 * `GET` / `POST` / `PUT` / `DELETE` / `PATCH` aliases.
 *
 * ```ts
 * export async function login(ctx: ApiContext) { /* … */ }
 * export function index(ctx: ApiContext) { /* … */ }
 * export async function create(ctx: ApiContext) { /* … */ }
 * ```
 *
 * ## URL matching (@dreamer/server@1.2.2 + router@1.2.1 via dweb@3.7.6)
 *
 * 1. `params.method` / `params.action` from routes like `/api/auth/:method` or `/api/users/:method`
 * 2. Else last path segment (kebab-case → camelCase), e.g. `/api/auth/login` → `login`
 * 3. Else fall back to export `index` when the resource path has no method:
 *    - **web**: `/api/<resource>` (exactly two segments, first `api`)
 *    - **kind:api** (apiOnly): bare `/` and `/<resource>` (parts.length 0|1)
 *
 * ### kind:"api" (this repo’s `api/` app, port 3003)
 *
 * Routes live at the URL root (no `/api` prefix). Verified with `deno task dev:api`:
 * - `GET /` → `index` (200) — root fallback (server 1.2.2)
 * - `GET /index` → `index` (200)
 * - `GET /users` / `GET /users/index` → users `index` (200)
 * - `GET /api/users` → 404 (no `/api` prefix on kind:api; expected)
 *
 * Dynamic resources: one action per file under the param folder, e.g.
 * `users/[id]/update.ts` → `/users/:id/update` (api) or `/api/users/:id/update` (web).
 */
import type { ApiContext } from "@dreamer/dweb";

export type ApiHandler = (
  ctx: ApiContext,
) => Response | Promise<Response>;
