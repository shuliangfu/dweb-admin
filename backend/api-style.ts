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
 * ## URL matching (@dreamer/server@1.2.1 + router@1.2.1)
 *
 * 1. `params.method` / `params.action` from routes like `/api/auth/:method` or `/api/users/:method`
 * 2. Else last path segment (kebab-case → camelCase), e.g. `/api/auth/login` → `login`
 * 3. Else for **web** paths `/api/<resource>` (exactly two segments, first `api`): fall back to export `index`
 *
 * ### kind:"api" (this repo’s `api/` app, port 3003)
 *
 * Routes live at the URL root (no `/api` prefix). The `/api/<resource>` → `index` fallback
 * does **not** apply. Use explicit action URLs:
 * - `GET /index` → `api/routes/index.ts` export `index` (via `/:method`)
 * - `GET /` alone does **not** auto-dispatch `index` (framework limit; do not bump dweb/server for this)
 * - `GET /users/index` or rely on short `/users/:method` for `index` / `create`
 *
 * Dynamic resources: one action per file under the param folder, e.g.
 * `users/[id]/update.ts` → `/api/users/:id/update`.
 */
import type { ApiContext } from "@dreamer/dweb";

export type ApiHandler = (
  ctx: ApiContext,
) => Response | Promise<Response>;
