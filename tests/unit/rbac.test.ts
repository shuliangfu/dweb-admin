import { assert, assertEquals } from "@std/assert";
import { isAuthOnlyPath, isPublicPath, matchRoute, normalizePath, ruleAllows } from "@common/service/rbac.ts";
import { hashPassword, verifyPassword } from "@common/service/password.ts";
import { normalizeLocale, pickLocalized, t } from "@common/i18n/mod.ts";

Deno.test("matchRoute: exact, segment wildcard, prefix wildcard", () => {
  assert(matchRoute("/api/users", "/api/users"));
  assert(!matchRoute("/api/users", "/api/users/1"));
  assert(matchRoute("/api/users/*", "/api/users/1"));
  assert(matchRoute("/api/users/:id", "/api/users/1"));
  // Yii2 style: "/a/*" covers everything below /a (any depth)
  assert(matchRoute("/api/users/*", "/api/users/1/x"));
  assert(!matchRoute("/api/users/*", "/api/other"));
  assert(matchRoute("/*", "/anything/at/all"));
  assert(matchRoute("/system/**", "/system"));
  assert(matchRoute("/system/**", "/system/users"));
  assert(!matchRoute("/system/**", "/systemx"));
  assert(matchRoute("/**", "/anything/at/all"));
});

Deno.test("ruleAllows: method + path binding", () => {
  const rules = [{ method: "GET" as const, path: "/api/users" }];
  assert(ruleAllows(rules, "GET", "/api/users"));
  assert(!ruleAllows(rules, "POST", "/api/users"));
  assert(ruleAllows([{ method: "*", path: "/api/**" }], "DELETE", "/api/roles/x"));
});

Deno.test("path classes", () => {
  assertEquals(normalizePath("//api//users/"), "/api/users");
  assert(isPublicPath("/login"));
  assert(isPublicPath("/assets/tailwind.css"));
  assert(!isPublicPath("/api/users"));
  assert(isPublicPath("/chunk-ABC123.js"));
  assert(!isPublicPath("/chunk-ABC123.js", "POST"));
  assert(!isPublicPath("/system/users.js/x"));
  assert(isAuthOnlyPath("/api/menus/mine"));
  assert(!isAuthOnlyPath("/system/users"));
});

Deno.test("password hash round trip", async () => {
  const h = await hashPassword("admin888");
  assert(h.startsWith("pbkdf2$"));
  assert(!h.includes("admin888"));
  assert(await verifyPassword("admin888", h));
  assert(!await verifyPassword("wrong", h));
  assert(!await verifyPassword("x", "garbage"));
});

Deno.test("i18n zh-CN / en-US", () => {
  assertEquals(t("zh-CN", "login.submit"), "登录");
  assertEquals(t("en-US", "login.submit"), "Sign in");
  assertEquals(t("en-US", "dashboard.welcome", { name: "A" }), "Welcome back, A");
  assertEquals(normalizeLocale("en-GB"), "en-US");
  assertEquals(pickLocalized({ "zh-CN": "你", "en-US": "you" }, "en-US"), "you");
});

// ---- Yii2-style hierarchy -------------------------------------------------
import { resolveGrants, wouldCycle, type Graph } from "@common/service/rbac.ts";
import { parseRouteInput } from "@common/service/rbac-admin.ts";

const graph: Graph = {
  items: {
    boss: { type: "role", isSuper: false },
    staff: { type: "role", isSuper: false },
    root: { type: "role", isSuper: true },
    "user.view": { type: "permission", isSuper: false },
    "user.all": { type: "permission", isSuper: false },
  },
  children: {
    boss: [{ type: "role", child: "staff" }, { type: "permission", child: "user.all" }],
    staff: [{ type: "permission", child: "user.view" }],
    "user.view": [{ type: "route", child: "GET /api/users" }],
    "user.all": [{ type: "permission", child: "user.view" }, { type: "route", child: "POST /api/users" }],
  },
};

Deno.test("resolveGrants expands role → role → permission → route", () => {
  const g = resolveGrants(graph, ["boss"]);
  const keys = g.rules.map((r) => `${r.method} ${r.path}`);
  assertEquals(keys.includes("GET /api/users"), true);
  assertEquals(keys.includes("POST /api/users"), true);
  assertEquals(g.isSuper, false);
  assertEquals(resolveGrants(graph, ["staff"]).rules.length, 1);
  assertEquals(resolveGrants(graph, ["root"]).isSuper, true);
});

Deno.test("resolveGrants is cycle safe; wouldCycle detects cycles", () => {
  const cyc: Graph = {
    items: { a: { type: "role", isSuper: false }, b: { type: "role", isSuper: false } },
    children: { a: [{ type: "role", child: "b" }], b: [{ type: "role", child: "a" }, { type: "route", child: "GET /x" }] },
  };
  assertEquals(resolveGrants(cyc, ["a"]).rules.length, 1);
  assertEquals(wouldCycle(graph, "staff", "boss"), true);
  assertEquals(wouldCycle(graph, "boss", "staff"), false);
  assertEquals(wouldCycle(graph, "user.view", "user.all"), true);
  assertEquals(wouldCycle(graph, "user.all", "user.view"), false);
  assertEquals(wouldCycle(graph, "a", "a"), true);
});

Deno.test("parseRouteInput", () => {
  assertEquals(parseRouteInput("GET /a, /b/*\nPOST /c"), ["GET /a", "* /b/*", "POST /c"]);
  assertEquals(parseRouteInput("nonsense"), null);
});
