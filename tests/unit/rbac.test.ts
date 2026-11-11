import { assert, assertEquals } from "@std/assert";
import {
  isAuthOnlyPath,
  isPublicPath,
  matchRoute,
  normalizePath,
  ruleAllows,
} from "@common/service/rbac.ts";
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
  assert(
    ruleAllows([{ method: "*", path: "/api/**" }], "DELETE", "/api/roles/x"),
  );
});

Deno.test("path classes", () => {
  assertEquals(normalizePath("//api//users/"), "/api/users");
  assert(isPublicPath("/login"));
  assert(isPublicPath("/api/auth/captcha"));
  assert(isPublicPath("/api/auth/captcha/check", "POST"));
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
  assertEquals(
    t("en-US", "dashboard.welcome", { name: "A" }),
    "Welcome back, A",
  );
  assertEquals(normalizeLocale("en-GB"), "en-US");
  assertEquals(
    pickLocalized({ "zh-CN": "你", "en-US": "you" }, "en-US"),
    "you",
  );
});

// ---- Yii2-style hierarchy -------------------------------------------------
import { type Graph, listPermissionsFromGraph, resolveGrants, wouldCycle } from "@common/service/rbac.ts";
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
    boss: [{ type: "role", child: "staff" }, {
      type: "permission",
      child: "user.all",
    }],
    staff: [{ type: "permission", child: "user.view" }],
    "user.view": [{ type: "route", child: "GET /api/users" }],
    "user.all": [{ type: "permission", child: "user.view" }, {
      type: "route",
      child: "POST /api/users",
    }],
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
    items: {
      a: { type: "role", isSuper: false },
      b: { type: "role", isSuper: false },
    },
    children: {
      a: [{ type: "role", child: "b" }],
      b: [{ type: "role", child: "a" }, { type: "route", child: "GET /x" }],
    },
  };
  assertEquals(resolveGrants(cyc, ["a"]).rules.length, 1);
  assertEquals(wouldCycle(graph, "staff", "boss"), true);
  assertEquals(wouldCycle(graph, "boss", "staff"), false);
  assertEquals(wouldCycle(graph, "user.view", "user.all"), true);
  assertEquals(wouldCycle(graph, "user.all", "user.view"), false);
  assertEquals(wouldCycle(graph, "a", "a"), true);
});

Deno.test("parseRouteInput", () => {
  assertEquals(parseRouteInput("GET /a, /b/*\nPOST /c"), [
    "GET /a",
    "* /b/*",
    "POST /c",
  ]);
  assertEquals(parseRouteInput("nonsense"), null);
});

Deno.test("listPermissionsFromGraph expands permissions; super lists all", () => {
  const g = listPermissionsFromGraph(graph, ["staff"]);
  assertEquals(g.permissions.includes("user.view"), true);
  assertEquals(g.isSuper, false);
  const root = listPermissionsFromGraph(graph, ["root"]);
  assertEquals(root.isSuper, true);
  assertEquals(root.permissions.includes("user.view"), true);
  assertEquals(root.permissions.includes("user.all"), true);
});

Deno.test("path classes: /chat and /api/chat are not AUTH_ONLY", () => {
  assert(!isAuthOnlyPath("/chat"));
  assert(!isAuthOnlyPath("/api/chat/sessions"));
  assert(!isAuthOnlyPath("/api/chat/claim"));
});


// ---- DataPanel auth caps (resolveResourceCaps / static) --------------------
import {
  resolveResourceCaps,
  staticAuthCaps,
  trimCapsForWrite,
  CHROME_CAPS,
} from "@common/resources/caps.ts";

const fullDef = {
  key: "user.index",
  create: async () => ({ ok: true as const }),
  update: async () => ({ ok: true as const }),
  remove: async () => ({ removed: 0, failed: [] }),
  setField: async () => ({ removed: 0, failed: [] }),
  statusField: "status",
  importRows: async () => ({ created: 0, failed: 0 }),
};

Deno.test("staticAuthCaps + chrome: auth vs non-auth split", () => {
  const a = staticAuthCaps(fullDef);
  assertEquals(a.create, true);
  assertEquals(a.import, true);
  assertEquals(a.export, true);
  assertEquals(CHROME_CAPS.print, true);
  assertEquals("print" in a, false);
});

Deno.test("trimCapsForWrite: no write → mutators off, view/export kept", () => {
  const c = trimCapsForWrite(staticAuthCaps(fullDef), false, "user.index");
  assertEquals(c.create, false);
  assertEquals(c.update, false);
  assertEquals(c.remove, false);
  assertEquals(c.batchStatus, false);
  assertEquals(c.import, false);
  assertEquals(c.view, true);
  assertEquals(c.export, true);
});

Deno.test("trimCapsForWrite: write → keep static; roles get synthetic create/update", () => {
  const u = trimCapsForWrite(staticAuthCaps(fullDef), true, "user.index");
  assertEquals(u.create, true);
  assertEquals(u.remove, true);
  const rolesDef = { key: "roles" as const };
  const rolesStatic = staticAuthCaps(rolesDef);
  assertEquals(rolesStatic.create, false);
  const r = trimCapsForWrite(rolesStatic, true, "roles");
  assertEquals(r.create, true);
  assertEquals(r.update, true);
  assertEquals(r.view, true);
  const ro = trimCapsForWrite(rolesStatic, false, "roles");
  assertEquals(ro.create, false);
  assertEquals(ro.update, false);
});

Deno.test("resolveResourceCaps: super → write UI (incl. ItemAdmin synthetic)", async () => {
  const c = await resolveResourceCaps({ roleCodes: [], isSuper: true }, { key: "roles" });
  assertEquals(c.create, true);
  assertEquals(c.update, true);
  assertEquals(c.view, true);
  assertEquals(c.export, true);
});

Deno.test("resolveResourceCaps: only-view panel keeps export, drops mutators via trim helper", () => {
  // Pure mapping covered by trimCapsForWrite; resolveResourceCaps(non-super) needs live graph.
  const viewOnly = trimCapsForWrite(staticAuthCaps(fullDef), false, "cms.article");
  assertEquals(viewOnly.create, false);
  assertEquals(viewOnly.import, false);
  assertEquals(viewOnly.batchStatus, false);
  assertEquals(viewOnly.view, true);
  assertEquals(viewOnly.export, true);
});


// ---- DataPanel ActionCtrl (call-site overrides) ---------------------------
// Import from published @dreamer/ui-view — CI has no sibling ../ui-view checkout.
import {
  assertRowActionsConfig,
  assertToolbarConfig,
  isRowBuiltin,
  isToolbarBuiltin,
  resolveActionCtrl,
} from "@dreamer/ui-view";

Deno.test("resolveActionCtrl: undefined → fallback; false hides; disable defaults false", () => {
  assertEquals(resolveActionCtrl(undefined, true), { show: true, disable: false });
  assertEquals(resolveActionCtrl(undefined, false).show, false);
  assertEquals(resolveActionCtrl(false, true).show, false);
  assertEquals(resolveActionCtrl(true, false).show, true);
  const o = resolveActionCtrl({ show: true, disable: true }, false);
  assertEquals(o.show, true);
  assertEquals(o.disable, true);
});

Deno.test("assertToolbarConfig / assertRowActionsConfig: custom requires action", () => {
  assertToolbarConfig({ create: true, search: false });
  assertRowActionsConfig({ view: false, edit: true });
  let threw = false;
  try {
    assertToolbarConfig({ myBtn: true });
  } catch (e) {
    threw = true;
    assertEquals(String(e).includes("myBtn"), true);
    assertEquals(String(e).includes("action"), true);
  }
  assertEquals(threw, true);
  threw = false;
  try {
    assertRowActionsConfig({ assign: { label: "A" } });
  } catch (e) {
    threw = true;
    assertEquals(String(e).includes("assign"), true);
  }
  assertEquals(threw, true);
  assertToolbarConfig({ myBtn: { label: "X", action: () => {} } });
  assertRowActionsConfig({ assign: { label: "A", action: () => {} } });
  assertEquals(isToolbarBuiltin("create"), true);
  assertEquals(isToolbarBuiltin("myBtn"), false);
  assertEquals(isRowBuiltin("view"), true);
  assertEquals(isRowBuiltin("assign"), false);
});
