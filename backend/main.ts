/**
 * backend application entry (dweb + @dreamer/view + @dreamer/ui-view + MongoDB).
 * Config is auto-loaded from common/config + backend/config.
 *
 * Middleware order (all from @dreamer/middlewares unless noted):
 *   requestId → requestLogger → healthCheck → rateLimit(login) → errorHandler → csrf → rbacGuard(own: role↔route↔method)
 */

import { App, type AppMiddleware } from "@dreamer/dweb";
import {
  csrf,
  errorHandler,
  healthCheck,
  rateLimit,
  requestId,
  requestLogger,
} from "@dreamer/middlewares";
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
import { staticPlugin } from "@dreamer/plugins/static";
import { themePlugin } from "@dreamer/plugins/theme";
import { uiViewTailwindPlugin } from "@dreamer/ui-view/plugin";
import { getEnv } from "@common/utils/env.ts";
import { seedAll } from "@common/service/seed.ts";
import { rbacGuardMiddleware } from "@backend/rbac-guard.ts";
import { randomHex } from "@common/service/password.ts";

const app = new App();
const use = (mw: unknown) => app.use(mw as AppMiddleware);
// deno-lint-ignore no-explicit-any
type Ctx = any;

const isDev = Deno.args.includes("--dev");
const pathOf = (ctx: Ctx) =>
  String(ctx.path ?? ctx.url?.pathname).replace(/\/$/, "");
/** Plain HTML form posts of the login page (no JS, so no CSRF header). */
const isLogin = (ctx: Ctx) =>
  ctx.method === "POST" &&
  ["/api/auth/login", "/api/auth/twofactor"].includes(pathOf(ctx));
/** Everything that can be used to guess credentials or captcha answers. */
const isAuthAttempt = (ctx: Ctx) =>
  isLogin(ctx) ||
  (ctx.method === "POST" &&
    (pathOf(ctx) === "/api/auth/passkey/verify" ||
      pathOf(ctx) === "/api/auth/captcha/check"));

use(requestId());
use(requestLogger({
  skip: (ctx: Ctx) => {
    const p = String(ctx.path ?? "");
    return p.startsWith("/assets/") || p.startsWith("/_client") ||
      p === "/api/health" || /\.(js|css|map|svg|ico)$/.test(p);
  },
}));
use(healthCheck({
  path: "/api/health",
  check: async () => {
    const { AdminUser } = await import("@common/model/mod.ts");
    try {
      await AdminUser.count({});
      return { healthy: true, details: { db: "ok" } };
    } catch {
      return { healthy: false, details: { db: "down" } };
    }
  },
}));
// Brute-force protection: login attempts per client, 20 / 10 min.
use(rateLimit({
  windowMs: 10 * 60_000,
  max: Number(Deno.env.get("LOGIN_RATE_MAX") ?? 20),
  skip: (ctx: Ctx) => !isAuthAttempt(ctx),
  message: "Too many login attempts, try again later",
}));
// The login page's feature query is public: cap it per client (60 / min).
// dweb registers middlewares by function name, so give this second limiter its own name.
{
  const optionsLimit = rateLimit({
    windowMs: 60_000,
    max: Number(Deno.env.get("LOGIN_OPTIONS_RATE_MAX") ?? 60),
    skip: (ctx: Ctx) => pathOf(ctx) !== "/api/auth/login-options",
    message: "Too many requests",
  });
  Object.defineProperty(optionsLimit, "name", {
    value: "loginOptionsRateLimit",
  });
  use(optionsLimit);
}
// dweb exposes no error-middleware hook, so adapt @dreamer/middlewares' errorHandler.
{
  const onError = errorHandler({ isDev });
  use(async (ctx: Ctx, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      await onError(ctx, error as Error, async () => {});
    }
  });
}
// Double-submit-cookie CSRF: JS reads the `_csrf` cookie and sends X-CSRF-Token (see common/utils/client-api.ts).
// Login is exempt (no session yet; the session cookie is SameSite=Lax).
use(csrf({
  cookieOptions: {
    httpOnly: false,
    sameSite: "lax",
    secure: getEnv("ADMIN_COOKIE_SECURE") === "1",
  },
  tokenGenerator: () => randomHex(24),
  shouldSkip: (ctx: Ctx) =>
    ["GET", "HEAD", "OPTIONS"].includes(ctx.method) || isLogin(ctx),
}));
/** Login + RBAC (role ↔ route ↔ method) for every request. */
use(rbacGuardMiddleware);

/** Generates the ui-view @source list; must be registered before the Tailwind plugin. */
app.registerPlugin(uiViewTailwindPlugin({
  outputPath: "backend/assets/ui-view-sources.css",
  scanPath: ["backend"],
}));

app.registerPlugin(tailwindPlugin({
  output: "dist/backend/client/assets",
  cssEntry: "backend/assets/tailwind.css",
  assetsPath: "/assets",
}));

/** Theme: injects an anti-flash script + sets <html class="dark"> from cookie/localStorage. */
// Same option set as senvis backend themePlugin (cookie name stays dweb-admin-theme).
app.registerPlugin(themePlugin({
  defaultMode: "system",
  strategy: "class",
  darkClass: "dark",
  attribute: "data-theme",
  cookieName: "dweb-admin-theme",
  cookieExpireDays: 365,
  injectScript: true,
  transitionDuration: 200,
  debug: false,
}));

app.registerPlugin(staticPlugin({
  statics: [
    { root: "backend/assets", prefix: "/assets" },
    { root: "dist/backend/client/assets", prefix: "/assets" },
  ],
}));

app.start().then(async () => {
  try {
    await seedAll();
    console.log("[dweb-admin-backend] ready");
  } catch (error) {
    console.error(
      "[dweb-admin-backend] seed failed (is MongoDB running? see .env)",
      error,
    );
  }
});
