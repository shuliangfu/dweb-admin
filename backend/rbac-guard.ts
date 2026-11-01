/**
 * Backend auth + RBAC middleware (dweb AppMiddleware).
 *
 * 1. Public paths pass through.
 * 2. (CSRF is handled by the @dreamer/middlewares csrf middleware registered before this one.)
 * 3. No valid session → 401 JSON for /api, 302 /login for pages.
 * 4. Logged in → role ↔ route ↔ method check (common/service/rbac.ts); deny → 403.
 */
import { getCurrentUser } from "@common/service/auth.ts";
import { canAccess, isPublicPath, normalizePath } from "@common/service/rbac.ts";
import { createT, resolveLocale } from "@common/i18n/mod.ts";

interface Ctx {
  request: Request;
  response?: Response;
  url: URL;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}


export async function rbacGuardMiddleware(
  ctx: Ctx,
  next: () => Promise<void>,
): Promise<void> {
  const pathname = normalizePath(ctx.url.pathname);
  if (isPublicPath(pathname, ctx.request.method)) return await next();

  const isApi = pathname.startsWith("/api/");
  const tr = createT(resolveLocale(ctx.request));

  const user = await getCurrentUser(ctx.request);
  if (!user) {
    ctx.response = isApi
      ? json(401, { error: "unauthorized", message: tr("error.unauthorized") })
      : new Response(null, { status: 302, headers: { Location: "/login" } });
    return;
  }

  if (!await canAccess(user.roleCodes, ctx.request.method, pathname)) {
    ctx.response = isApi
      ? json(403, {
        error: "forbidden",
        message: tr("error.forbidden"),
        method: ctx.request.method,
        path: pathname,
      })
      : new Response(null, { status: 302, headers: { Location: "/error/403" } });
    return;
  }
  await next();
}
