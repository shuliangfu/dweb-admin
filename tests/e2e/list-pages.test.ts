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

/**
 * Regression: the toolbar (add / search / refresh / print / [import] / export / columns) is ONE joined
 * button group — buttons are direct siblings, flush, only the outer corners are rounded.
 * (It broke when every button was wrapped in a <span> to carry data-testid.)
 */
Deno.test({ name: "toolbar: add/search/refresh/print/export/columns form one connected button group on every list + admin page", ...OPTS, fn: async () => {
  await ensureServer();
  const pages = ["/rbac/admins", "/rbac/roles", "/rbac/permissions", "/developer/menus", ...LIST_PAGES.map(([p]) => p)];
  for (const dark of [false, true]) {
    const { browser, ctx } = await browserLoggedIn();
    try {
      if (dark) await ctx.addCookies([{ name: "dweb-admin-theme", value: "dark", url: BASE }]);
      const page = await ctx.newPage();
      for (const path of pages) {
        await page.goto(BASE + path);
        await page.waitForSelector("[data-testid=dp-table]");
        await page.waitForSelector("[data-testid=dp-refresh]"); // ids are attached after mount
        const r = await page.evaluate(() => {
          const root = document.querySelector("[data-dp-tools]")!;
          const group = root.querySelector(".dp-tool-group") as HTMLElement;
          const btns = [...root.querySelectorAll("button")] as HTMLElement[];
          const rect = btns.map((b) => b.getBoundingClientRect());
          const radius = btns.map((b) => {
            const c = getComputedStyle(b);
            return { l: parseFloat(c.borderTopLeftRadius) || 0, r: parseFloat(c.borderTopRightRadius) || 0 };
          });
          return {
            n: btns.length,
            isToolGroup: !!group && group.getAttribute("role") === "group" && btns.every((b) => group.contains(b)),
            wrappers: [...group.children].every((c) => c === (c as HTMLElement) && c.querySelectorAll("button").length === 1),
            noWrapSpan: btns.every((b) => !b.parentElement?.hasAttribute("data-testid")),
            gaps: rect.slice(1).map((x, i) => Math.round((x.left - rect[i].right) * 10) / 10),
            sameRow: rect.every((x) => Math.abs(x.top - rect[0].top) < 0.5),
            radius,
            dividers: btns.map((b) => getComputedStyle(b).boxShadow),
            ids: btns.map((b) => b.getAttribute("data-testid")),
          };
        });
        assert(r.n >= 5, `${path}: ${r.n} toolbar buttons`);
        assert(r.isToolGroup && r.wrappers, `${path}: one .dp-tool-group with one button per slot`);
        assert(r.noWrapSpan, `${path}: buttons must not be wrapped`);
        assert(r.sameRow, `${path}: one row`);
        for (const g of r.gaps) assert(g <= 0.5, `${path}: gap ${g}px between toolbar buttons (${dark ? "dark" : "light"}) — must be flush`);
        assert(r.radius[0].l > 0 && r.radius[0].r === 0, `${path}: first button rounded only on the left`);
        assert(r.radius[r.n - 1].r > 0 && r.radius[r.n - 1].l === 0, `${path}: last button rounded only on the right`);
        // every divider is the same dark hairline (the old bug: the last gap rendered a bright line); the last button has none
        const inner = r.dividers.slice(0, -1);
        assert(inner.every((d) => d !== "none" && d === inner[0]), `${path}: all dividers identical (${inner.join(" | ")})`);
        assertEquals(r.dividers[r.n - 1], "none", `${path}: no divider after the last button`);
        for (const x of r.radius.slice(1, -1)) assert(x.l === 0 && x.r === 0, `${path}: middle buttons are square`);
        assert(r.ids.includes("dp-refresh") && r.ids.includes("dp-export") && r.ids.includes("dp-columns"), `${path}: test ids attached ${r.ids}`);
      }
      await page.goto(BASE + "/user");
      await page.waitForSelector("[data-testid=dp-refresh]");
      await page.locator("[data-testid=data-panel-toolbar]").screenshot({ path: `runtime/theme/toolbar-${dark ? "dark" : "light"}.png` });
    } finally {
      await browser.close();
    }
  }
} });

/** The search form expands directly below the toolbar and above the table; clicking the button again collapses it. */
Deno.test({ name: "search form: opens between toolbar and table on every list + admin page, second click collapses it", ...OPTS, fn: async () => {
  await ensureServer();
  const pages = ["/rbac/admins", "/rbac/roles", "/rbac/permissions", "/developer/menus", ...LIST_PAGES.map(([p]) => p)];
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    for (const path of pages) {
      await page.goto(BASE + path);
      await page.waitForSelector("[data-testid=dp-search-toggle]");
      assertEquals(await page.locator("[data-testid=dp-search]").count(), 0, `${path}: closed by default`);
      await page.click("[data-testid=dp-search-toggle]");
      await page.waitForSelector("[data-testid=dp-search]");
      const y = await page.evaluate(() => {
        const top = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return { tool: top("[data-testid=data-panel-toolbar]"), search: top("[data-testid=dp-search]"), table: top("[data-testid=dp-table]") };
      });
      assert(y.search.top >= y.tool.bottom - 0.5, `${path}: search below the toolbar`);
      assert(y.search.bottom <= y.table.top + 0.5, `${path}: search above the table (search ${y.search.bottom} / table ${y.table.top})`);
      assert(Math.abs(y.search.top - y.tool.bottom) < 2, `${path}: search directly under the toolbar`);
      if (path === "/user") await page.screenshot({ path: "runtime/theme/search-open.png" });
      await page.click("[data-testid=dp-search-toggle]");
      await page.waitForSelector("[data-testid=dp-search]", { state: "detached" });
    }
  } finally {
    await browser.close();
  }
} });
