/// <reference lib="dom" />
/**
 * Regression: the member list (and every other catalog list page) must render the DataPanel
 * (toolbar + table) without client errors. Root cause of the original bug: DataPanel moved to the
 * resource-driven API (`initial` payload) while the old StubList still passed the legacy props →
 * "Cannot read properties of undefined (reading 'meta')" and an empty page.
 */
import { assert, assertEquals } from "@std/assert";
import { adminApi, BASE, browserLoggedIn, ensureServer, rand } from "../helpers.ts";

const OPTS = { sanitizeOps: false, sanitizeResources: false };
const LIST_PAGES: [string, string][] = [
  ["/user", "user.index"], ["/user/active", "user.active"], ["/user/zombie", "user.zombie"],
  ["/cms/article", "cms.article"], ["/cms/news", "cms.news"], ["/cms/notice", "cms.notice"], ["/cms/photo", "cms.photo"],
  ["/developer/database", "developer.database"], ["/developer/feedback", "developer.feedback"],
  ["/developer/language", "developer.language"], ["/developer/system", "developer.system"], ["/system/region", "system.region"],
];

Deno.test({ name: "list pages: every catalog list renders DataPanel toolbar + table, no client errors", ...OPTS, fn: async () => {
  await ensureServer();
  const { browser, ctx } = await browserLoggedIn();
  try {
    for (const [path] of LIST_PAGES) {
      const page = await ctx.newPage();
      const errs: string[] = [];
      page.on("pageerror", (e: Error) => errs.push(String(e)));
      page.on("console", (m: any) => { if (m.type() === "error" && !/__hmr|HMR|WebSocket/.test(m.text())) errs.push(m.text()); });
      await page.goto(BASE + path);
      await page.waitForSelector("[data-testid=dp-table]", { timeout: 8000 });
      await page.waitForTimeout(400); // after hydration the panel must still be there
      assertEquals(await page.locator("[data-testid=data-panel-toolbar]").count(), 1, `${path}: toolbar`);
      assertEquals(await page.locator("[data-testid=dp-table]").count(), 1, `${path}: table`);
      assertEquals(await page.locator("[data-testid=dp-create]").count(), 1, `${path}: create button`);
      assertEquals(errs, [], `${path}: client errors`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}});

Deno.test({ name: "member list: create through the Modal, then search + remove", ...OPTS, fn: async () => {
  await ensureServer();
  const api = await adminApi();
  const name = `m_${rand()}`;
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    await page.goto(BASE + "/user");
    await page.waitForSelector("[data-testid=dp-table]");
    await page.waitForTimeout(400);
    await page.click("[data-testid=dp-create]");
    await page.waitForSelector("[data-testid=dp-form]");
    await page.fill("[data-testid=dp-fld-username] input", name);
    await page.fill("[data-testid=dp-fld-email] input", `${name}@example.com`);
    await page.click("[data-testid=dp-form-submit]");
    await page.waitForSelector("[data-testid=dp-form]", { state: "detached" });
    await page.waitForSelector(`[data-testid=dp-table] >> text=${name}`);
    await page.screenshot({ path: "runtime/theme/member-list.png" });

    // server-side search
    const found = await api.get(`/api/res?res=user.index&username=${name}`);
    assertEquals(found.data.total, 1);
    const id = found.data.rows[0].id as string;

    // delete only after the confirm dialog
    const del = await api.post("/api/res/remove", { res: "user.index", ids: [id] });
    assert(del.status === 200, `remove ${del.status}`);
    assertEquals((await api.get(`/api/res?res=user.index&username=${name}`)).data.total, 0);
  } finally {
    await browser.close();
  }
}});

Deno.test({ name: "member segments: active / zombie pages only list their own status", ...OPTS, fn: async () => {
  await ensureServer();
  const api = await adminApi();
  const n = `s_${rand()}`;
  for (const status of ["active", "zombie"]) {
    const r = await api.post("/api/res/create", { res: "user.index", username: `${n}_${status}`, email: `${n}_${status}@example.com`, status });
    assertEquals(r.status, 201, JSON.stringify(r.data));
  }
  const ids: string[] = [];
  for (const [res, status] of [["user.active", "active"], ["user.zombie", "zombie"]]) {
    const r = await api.get(`/api/res?res=${res}&username=${n}`);
    assertEquals(r.data.total, 1, `${res} lists only ${status}`);
    assertEquals(r.data.rows[0].status, status);
    ids.push(r.data.rows[0].id);
  }
  await api.post("/api/res/remove", { res: "user.index", ids });
}});
