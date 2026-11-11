/** Login, remember-me, 2FA/TOTP, passkey options, logout, unlock, password change — API level. */
import { assert, assertEquals, assertMatch, assertNotEquals } from "@std/assert";
import { Api, adminApi, BASE, ensureServer, makeUser, removeUser, stopServer, totpCode } from "../helpers.ts";

const OPTS = { sanitizeOps: false, sanitizeResources: false };

Deno.test({ name: "auth: wrong password and unknown user fail identically; right password logs in", ...OPTS, fn: async () => {
  await ensureServer();
  const a = new Api();
  const bad = await a.login("admin", "wrong-password");
  const none = await new Api().login("no_such_user_" + Date.now(), "whatever1");
  assertEquals(bad.status, 401);
  assertEquals(none.status, 401);
  assertEquals(bad.data.error, none.data.error);
  const ok = await new Api().login();
  assertEquals(ok.status, 200);
  assertEquals(ok.data.user.username, "admin");
  assert(ok.data.user.roleCodes.includes("super_admin"));
} });

Deno.test({ name: "auth: session cookie works for /api/auth/me and dies after logout", ...OPTS, fn: async () => {
  const a = await adminApi();
  const me = await a.get("/api/auth/me");
  assertEquals(me.status, 200);
  assertEquals(me.data.user.username, "admin");
  assertEquals(me.data.isSuper, true);
  assert(Array.isArray(me.data.permissions) && me.data.permissions.includes("admin.view"));
  assert(Array.isArray(me.data.user.permissions) && me.data.user.permissions.includes("admin.write"));
  const out = await a.post("/api/auth/logout");
  assertEquals(out.status, 302);
  const after = await a.get("/api/auth/me");
  assertEquals(after.status, 401);
} });

Deno.test({ name: "auth: anonymous requests to protected API/pages are rejected / redirected", ...OPTS, fn: async () => {
  await ensureServer();
  const a = new Api();
  assertEquals((await a.get("/api/auth/me")).status, 401);
  assertEquals((await a.get("/api/res?res=admins")).status, 401);
  const page = await a.get("/rbac/admins");
  assert([302, 401, 403].includes(page.status));
  if (page.status === 302) assertMatch(page.res.headers.get("location") ?? "", /\/login/);
} });

Deno.test({ name: "auth: remember-me issues a much longer-lived session cookie", ...OPTS, fn: async () => {
  await ensureServer();
  const maxAge = async (remember: boolean) => {
    const a = new Api();
    await a.req("GET", "/login");
    const r = await a.req("POST", "/api/auth/login", { username: "admin", password: "admin888", remember });
    assertEquals(r.status, 200);
    const sc = r.res.headers.getSetCookie().find((c) => c.startsWith("dweb_admin_sid="));
    assert(sc, "session cookie set");
    return Number(sc!.match(/Max-Age=(\d+)/i)?.[1] ?? 0);
  };
  const short = await maxAge(false);
  const long = await maxAge(true);
  assert(short > 0);
  assert(long > short * 5, `remember (${long}s) must outlive default (${short}s)`);
} });

Deno.test({ name: "auth: TOTP setup → enable → login needs code → wrong code rejected → disable", ...OPTS, fn: async () => {
  const admin = await adminApi();
  const u = await makeUser(admin, ["operator"]);
  try {
    const me = new Api();
    assertEquals((await me.login(u.username, u.password)).status, 200);
    // enabling with a wrong code fails, start required first
    assertEquals((await me.post("/api/account/totp/enable", { code: "000000" })).status >= 400, true);
    const setup = await me.post("/api/account/totp/setup");
    assertEquals(setup.status, 200);
    assertMatch(setup.data.secret, /^[A-Z2-7]{16,}$/);
    assertMatch(setup.data.otpauthUrl, /^otpauth:\/\/totp\//);
    assertMatch(setup.data.qrCode, /^data:image\//);
    assertEquals((await me.post("/api/account/totp/enable", { code: "123456" })).status >= 400, true);
    // Each TOTP step can be used once (anti-replay): enable = previous step, login = now, disable = next step.
    assertEquals((await me.post("/api/account/totp/enable", { code: await totpCode(setup.data.secret, Date.now() - 30000) })).status, 200);
    const sec = await me.get("/api/account/security");
    assertEquals(sec.data.totpEnabled, true);

    // fresh login now needs the second factor
    const l2 = new Api();
    const step1 = await l2.login(u.username, u.password);
    assertEquals(step1.status, 200);
    assertEquals(step1.data.status, "2fa");
    assertEquals((await l2.get("/api/auth/me")).status, 401, "no session before the code");
    assertEquals((await l2.post("/api/auth/twofactor", { code: "000000" })).status, 401);
    const step2 = await l2.post("/api/auth/twofactor", { code: await totpCode(setup.data.secret) });
    assertEquals(step2.status, 200);
    assertEquals((await l2.get("/api/auth/me")).status, 200);

    // disable needs a valid code
    assertEquals((await l2.post("/api/account/totp/disable", { code: "000000" })).status >= 400, true);
    const dis = await l2.post("/api/account/totp/disable", { code: await totpCode(setup.data.secret, Date.now() + 30000) });
    assertEquals(dis.status, 200);
    const l3 = new Api();
    assertEquals((await l3.login(u.username, u.password)).data.status, undefined);
  } finally {
    await removeUser(admin, u);
  }
} });

Deno.test({ name: "auth: 2FA + remember carries the remember flag through the challenge", ...OPTS, fn: async () => {
  const admin = await adminApi();
  const u = await makeUser(admin, ["operator"]);
  try {
    const me = new Api();
    await me.login(u.username, u.password);
    const setup = await me.post("/api/account/totp/setup");
    await me.post("/api/account/totp/enable", { code: await totpCode(setup.data.secret, Date.now() - 30000) });
    const l = new Api();
    await l.req("GET", "/login");
    const s1 = await l.req("POST", "/api/auth/login", { username: u.username, password: u.password, remember: true });
    assertEquals(s1.data.status, "2fa");
    const s2 = await l.post("/api/auth/twofactor", { code: await totpCode(setup.data.secret) });
    const sc = s2.res.headers.getSetCookie().find((c) => c.startsWith("dweb_admin_sid="))!;
    assert(Number(sc.match(/Max-Age=(\d+)/i)?.[1]) > 86400 * 2, "remember session cookie is long-lived");
  } finally {
    await removeUser(admin, u);
  }
} });

Deno.test({ name: "auth: passkey endpoints require login for registration and expose login options publicly", ...OPTS, fn: async () => {
  await ensureServer();
  const anon = new Api();
  assertEquals((await anon.post("/api/account/passkeys/options")).status, 401);
  const lo = await anon.get("/api/auth/login-options");
  assertEquals(lo.status, 200);
  assertEquals(typeof lo.data.passkey, "boolean");
  const pk = await anon.post("/api/auth/passkey/options");
  assertEquals(pk.status, 200);
  assert(pk.data.options.challenge, "challenge present");
  assertEquals((await anon.post("/api/auth/passkey/verify", { response: {} })).status, 401);
  const admin = await adminApi();
  const reg = await admin.post("/api/account/passkeys/options");
  assertEquals(reg.status, 200);
  assert(reg.data.options.challenge && reg.data.options.rp && reg.data.options.user);
} });

Deno.test({ name: "auth: change password rejects wrong current password and works with the right one", ...OPTS, fn: async () => {
  const admin = await adminApi();
  const u = await makeUser(admin, ["operator"]);
  try {
    const me = new Api();
    await me.login(u.username, u.password);
    const bad = await me.post("/api/account/password", { current: "nope", password: "NewPassw0rd!x", password2: "NewPassw0rd!x", oldPassword: "nope", newPassword: "NewPassw0rd!x", confirm: "NewPassw0rd!x" });
    assert(bad.status >= 400, "wrong current password rejected");
    const good = await me.post("/api/account/password", { current: u.password, oldPassword: u.password, password: "NewPassw0rd!x", newPassword: "NewPassw0rd!x", password2: "NewPassw0rd!x", confirm: "NewPassw0rd!x" });
    assertEquals(good.status, 200, JSON.stringify(good.data));
    assertEquals((await new Api().login(u.username, u.password)).status, 401);
    assertEquals((await new Api().login(u.username, "NewPassw0rd!x")).status, 200);
  } finally {
    await removeUser(admin, u);
  }
} });

Deno.test({ name: "auth: lock-screen unlock checks the password", ...OPTS, fn: async () => {
  const a = await adminApi();
  assertEquals((await a.post("/api/auth/unlock", { password: "wrong" })).status, 401);
  assertEquals((await a.post("/api/auth/unlock", { password: "admin888" })).status, 200);
} });

Deno.test({ name: "auth: locale switch endpoint sets a cookie and redirects safely", ...OPTS, fn: async () => {
  await ensureServer();
  const a = new Api();
  const r = await a.get("/api/i18n/locale?lang=en-US&redirect=/rbac/admins");
  assertEquals(r.status, 302);
  assertEquals(r.res.headers.get("location"), "/rbac/admins");
  assertMatch(r.res.headers.getSetCookie().join(";"), /en-US/);
  const evil = await a.get("/api/i18n/locale?lang=en-US&redirect=//evil.example");
  assertEquals(evil.res.headers.get("location"), "/");
  assertNotEquals(BASE, "");
  stopServer();
} });
