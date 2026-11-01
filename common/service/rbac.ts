/**
 * RBAC: role ↔ route ↔ HTTP method.
 *
 * - Public paths need no login (login page, assets, i18n switch).
 * - Auth-only paths need a valid session but no role binding (dashboard, me, logout, own menu).
 * - Everything else requires a role whose (recursively expanded) routes match method + path,
 *   unless the user holds a super role (isSuper).
 */
import { CacheManager, MemoryAdapter } from "@dreamer/cache";
import {
  AuthItem,
  AuthItemChild,
  type AuthItemChildDocument,
  type AuthItemDocument,
  parseRouteKey,
  type RouteMethod,
} from "@common/model/mod.ts";

/** Exact public paths and public prefixes. */
const PUBLIC_EXACT = new Set([
  "/login",
  "/favicon.ico",
  "/password/forget",
  "/password/reset",
  "/error/403",
  "/error/404",
  "/error/500",
  "/api/auth/login",
  "/api/auth/twofactor",
  "/api/auth/login-options",
  "/api/health",
]);
const PUBLIC_PREFIX = ["/assets/", "/_client", "/__hmr", "/api/i18n/", "/api/auth/passkey/"];

/** Own-account endpoints: any logged-in user (password, 2FA, passkeys). */
const AUTH_ONLY_PREFIX = [
  "/api/account/",
];

/** Logged-in users may always access these (no role binding required). */
/** Logged-in users may always access these (no role binding required).
 * Stub module pages (user/cms/finance/count/developer + most /system/*) are NOT
 * listed here — they require a super role or an explicit route grant.
 */
const AUTH_ONLY_EXACT = new Set([
  "/",
  "/workspace",
  "/lock",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/unlock",
  "/api/menus/mine",
]);

/** Normalize a request path: collapse slashes, drop trailing slash. */
export function normalizePath(pathname: string): string {
  let p = pathname.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

/**
 * dweb's client bundle emits code-split chunks at the site root
 * (/chunk-XXXX.js, /login-XXXX.js, ...). They must load before login, so a
 * single-segment static-file path is public (GET/HEAD only, see rbac-guard).
 */
const ROOT_STATIC = /^\/[^/]+\.(?:js|mjs|map|css|ico|svg|png|jpe?g|webp|woff2?)$/i;

export function isPublicPath(pathname: string, method = "GET"): boolean {
  const p = normalizePath(pathname);
  if (PUBLIC_EXACT.has(p) || PUBLIC_PREFIX.some((x) => p.startsWith(x))) return true;
  const m = method.toUpperCase();
  return (m === "GET" || m === "HEAD") && ROOT_STATIC.test(p);
}

export function isAuthOnlyPath(pathname: string): boolean {
  const p = normalizePath(pathname);
  return AUTH_ONLY_EXACT.has(p) || AUTH_ONLY_PREFIX.some((x) => p.startsWith(x));
}

/**
 * Does `pattern` match `path`? (Yii2-style route wildcards)
 * - "/*" or "/**"  : everything
 * - "/a/*" or "/a/**": "/a" and anything below it (any depth)
 * - "*" or ":param" in the middle: exactly one segment
 */
export function matchRoute(pattern: string, pathname: string): boolean {
  const pat = normalizePath(pattern);
  const path = normalizePath(pathname);
  if (pat === "/*" || pat === "/**") return true;
  if (pat.endsWith("/**") || pat.endsWith("/*")) {
    const prefix = pat.slice(0, pat.endsWith("/**") ? -3 : -2);
    return path === prefix || path.startsWith(prefix + "/");
  }
  const ps = pat.split("/");
  const xs = path.split("/");
  if (ps.length !== xs.length) return false;
  return ps.every((seg, i) => seg === "*" || seg.startsWith(":") || seg === xs[i]);
}

/** Does a binding's method cover the request method? */
export function matchMethod(bound: string, method: string): boolean {
  return bound === "*" || bound.toUpperCase() === method.toUpperCase();
}

/** Pure check against an already loaded rule list (used by tests too). */
export function ruleAllows(
  rules: Rule[],
  method: string,
  pathname: string,
): boolean {
  return rules.some((r) => matchMethod(r.method, method) && matchRoute(r.path, pathname));
}

export interface Rule {
  method: RouteMethod | string;
  path: string;
}

/** Graph view: item name → item meta, parent → children. Plain data (cache friendly). */
export interface Graph {
  items: Record<string, { type: string; isSuper: boolean }>;
  children: Record<string, { type: string; child: string }[]>;
}

/**
 * Expand `roleNames` through roles/permissions (Yii2 hierarchy) into the set of
 * route rules they grant. Cycle-safe: every item is visited at most once.
 * `isSuper` is true when any visited role is a super role.
 */
export function resolveGrants(graph: Graph, roleNames: string[]): { rules: Rule[]; isSuper: boolean } {
  const visited = new Set<string>();
  const rules: Rule[] = [];
  let isSuper = false;
  const stack = roleNames.filter((n) => graph.items[n]);
  while (stack.length) {
    const name = stack.pop()!;
    if (visited.has(name)) continue;
    visited.add(name);
    const meta = graph.items[name];
    if (!meta) continue;
    if (meta.type === "role" && meta.isSuper) isSuper = true;
    for (const c of graph.children[name] ?? []) {
      if (c.type === "route") {
        const r = parseRouteKey(c.child);
        if (r) rules.push(r);
      } else if (graph.items[c.child]) {
        stack.push(c.child);
      }
    }
  }
  return { rules, isSuper };
}

/**
 * Would adding `child` under `parent` create a cycle (child already reaches parent)?
 * Also true for parent === child.
 */
export function wouldCycle(graph: Graph, parent: string, child: string): boolean {
  if (parent === child) return true;
  const seen = new Set<string>();
  const stack = [child];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === parent) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const c of graph.children[n] ?? []) if (c.type !== "route") stack.push(c.child);
  }
  return false;
}

/** Graph cache (@dreamer/cache, in-memory, 5s TTL as a safety net). */
const cache = new CacheManager(new MemoryAdapter({ ttl: 5, maxSize: 10 }), "rbac");
const CACHE_KEY = "graph";

/** Drop the cached graph; call after ANY change to items / children / routes. */
export async function invalidateRbacCache(): Promise<void> {
  await cache.delete(CACHE_KEY);
}

/** Load (cached) item graph from MongoDB. */
export async function loadGraph(): Promise<Graph> {
  const hit = await cache.get<Graph>(CACHE_KEY);
  if (hit) return hit;
  const items = (await AuthItem.findAll({})) as unknown as AuthItemDocument[];
  const kids = (await AuthItemChild.findAll({})) as unknown as AuthItemChildDocument[];
  const g: Graph = { items: {}, children: {} };
  for (const i of items) g.items[i.name] = { type: i.type, isSuper: !!i.isSuper };
  for (const k of kids) (g.children[k.parent] ??= []).push({ type: k.childType, child: k.child });
  await cache.set(CACHE_KEY, g);
  return g;
}

/** True if any of the roles is (or contains) a super role. */
export async function hasSuperRole(roleCodes: string[]): Promise<boolean> {
  return resolveGrants(await loadGraph(), roleCodes).isSuper;
}

/** Core decision: may a user with `roleCodes` call `method pathname`? */
export async function canAccess(
  roleCodes: string[],
  method: string,
  pathname: string,
): Promise<boolean> {
  if (isAuthOnlyPath(pathname)) return true;
  const grants = resolveGrants(await loadGraph(), roleCodes);
  return grants.isSuper || ruleAllows(grants.rules, method, pathname);
}
