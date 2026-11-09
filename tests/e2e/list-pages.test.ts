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
            borders: btns.map((b) => { const c = getComputedStyle(b); return { l: parseFloat(c.borderLeftWidth), r: parseFloat(c.borderRightWidth), rc: c.borderRightColor }; }),
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
        // exactly ONE faint 1px divider between neighbours: the left button's right border; the right button has no left
        // border and nothing adds a shadow/ring (the old bug drew a second, bright line)
        for (let i = 0; i < r.n; i++) {
          // ui-view Button + !shadow-none may compute as transparent 0px layers instead of literal "none".
          const sh = String(r.dividers[i] ?? "");
          const noVisibleShadow = sh === "none" || /^(\s*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)\s+0px\s+0px\s+0px\s+0px\s*,?)+\s*$/.test(sh);
          assert(noVisibleShadow, `${path}: button ${i} must not draw an extra shadow line (got ${sh})`);
          if (i < r.n - 1) assertEquals(r.borders[i].r, 1, `${path}: button ${i} right border is the 1px divider`);
          if (i > 0) assertEquals(r.borders[i].l, 0, `${path}: button ${i} has no left border (would double the divider)`);
        }
        assert(r.borders.slice(0, -1).every((b) => b.rc === r.borders[0].rc), `${path}: all dividers share one colour`);
        for (const x of r.radius.slice(1, -1)) assert(x.l === 0 && x.r === 0, `${path}: middle buttons are square`);
        assert(r.ids.includes("dp-refresh") && r.ids.includes("dp-export") && r.ids.includes("dp-columns"), `${path}: test ids attached ${r.ids}`);
      }
      await page.goto(BASE + "/user");
      await page.waitForSelector("[data-testid=dp-refresh]");
      const bb = await page.locator(".dp-tool-group").first().boundingBox();
      const zoom = await ctx.newPage();
      await zoom.setViewportSize({ width: 1280, height: 800 });
      // zoomed crop (4x) for eyeballing the dividers
      const cdp = await ctx.newCDPSession(page);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: bb!.x - 6, y: bb!.y - 6, width: bb!.width + 12, height: bb!.height + 12, scale: 4 } });
      await Deno.writeFile(`runtime/theme/toolbar-${dark ? "dark" : "light"}.png`, Uint8Array.from(atob(shot.data), (c) => c.charCodeAt(0)));
      await zoom.close();
    } finally {
      await browser.close();
    }
  }
} });

/** The search button opens a Modal search form (never an inline block that pushes the table); Esc / close dismisses it. */
Deno.test({ name: "search form: toolbar button opens a Modal on every list + admin page and never moves the table", ...OPTS, fn: async () => {
  await ensureServer();
  const pages = ["/rbac/admins", "/rbac/roles", "/rbac/permissions", "/developer/menus", ...LIST_PAGES.map(([p]) => p)];
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    for (const path of pages) {
      await page.goto(BASE + path);
      await page.waitForSelector("[data-testid=dp-table]");
      await page.waitForSelector("[data-testid=dp-search-toggle]");
      await page.waitForTimeout(400); // hydrate before click (SSR toggle is inert)
      assertEquals(await page.locator("[data-testid=dp-search]").count(), 0, `${path}: no inline search form`);
      const before = await page.evaluate(() => document.querySelector("[data-testid=dp-table]")!.getBoundingClientRect().top);
      await page.locator("[data-testid=dp-search-toggle]").click();
      // Prefer aria-modal: chrome may keep a hidden role=dialog panel in the DOM.
      await page.waitForSelector("[role=dialog][aria-modal=true] [data-testid=dp-search]", { timeout: 15000 });
      assert(await page.locator("[role=dialog][aria-modal=true] [data-testid=dp-search-submit]").count() === 1, `${path}: submit button in the Modal`);
      assert(await page.locator("[role=dialog][aria-modal=true] [data-testid=dp-search-reset]").count() === 1, `${path}: reset button in the Modal`);
      const after = await page.evaluate(() => document.querySelector("[data-testid=dp-table]")!.getBoundingClientRect().top);
      assertEquals(after, before, `${path}: opening the search Modal does not move the table`);
      if (path === "/user") await page.screenshot({ path: "runtime/theme/search-open.png" });
      await page.keyboard.press("Escape");
      await page.waitForSelector("[role=dialog][aria-modal=true] [data-testid=dp-search]", { state: "detached" });
    }
  } finally {
    await browser.close();
  }
} });

/** Submit searches (server side), the Modal closes and re-opens with the value; Reset clears the filter. */
Deno.test({ name: "search form Modal: submit filters the list, reset clears it", ...OPTS, fn: async () => {
  await ensureServer();
  const api = await adminApi();
  const name = `q_${rand()}`;
  const r = await api.post("/api/res/create", { res: "user.index", username: name, email: `${name}@example.com` });
  assertEquals(r.status, 201, JSON.stringify(r.data));
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    await page.goto(BASE + "/user");
    await page.waitForSelector("[data-testid=dp-table]");
    await page.waitForSelector("[data-testid=dp-search-toggle]");
    await page.waitForTimeout(400);
    const totalAll = Number((await page.locator("[data-testid=dp-total-count]").innerText()).replace(/\D/g, ""));
    assert(totalAll > 1, "more than one member exists");
    await page.click("[data-testid=dp-search-toggle]");
    await page.fill("[data-testid=dp-f-username] input", name);
    await page.click("[data-testid=dp-search-submit]");
    await page.waitForSelector("[data-testid=dp-search]", { state: "detached" });
    await page.waitForSelector(`[data-testid=dp-table] >> text=${name}`);
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=dp-row-]").length === 1);
    assertEquals(await page.locator("[data-testid^=dp-row-]").count(), 1, "only the matching row remains");
    // the Modal re-opens with the active filter
    await page.click("[data-testid=dp-search-toggle]");
    assertEquals(await page.inputValue("[data-testid=dp-f-username] input"), name);
    await page.click("[data-testid=dp-search-reset]");
    await page.waitForFunction((n: number) => {
      const t = document.querySelector("[data-testid=dp-total-count]")!.textContent ?? "";
      return Number(t.replace(/\D/g, "")) === n;
    }, totalAll);
    assertEquals(await page.inputValue("[data-testid=dp-f-username] input"), "", "reset clears the field");
    await page.keyboard.press("Escape");
  } finally {
    await browser.close();
    const found = await api.get(`/api/res?res=user.index&username=${name}`);
    if (found.data.rows?.[0]) await api.post("/api/res/remove", { res: "user.index", ids: [found.data.rows[0].id] });
  }
} });

/** The bulk bar is BELOW the table: selecting rows must not push the table down. */
Deno.test({ name: "bulk bar: appears below the table and selecting rows does not move the table", ...OPTS, fn: async () => {
  await ensureServer();
  const api = await adminApi();
  const name = `b_${rand()}`;
  const r = await api.post("/api/res/create", { res: "user.index", username: name, email: `${name}@example.com` });
  assertEquals(r.status, 201, JSON.stringify(r.data));
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    await page.goto(BASE + "/user");
    await page.waitForSelector("[data-testid=dp-table]");
    await page.waitForTimeout(400);
    assertEquals(await page.locator("[data-testid=dp-batch-bar]").count(), 0, "no bulk bar without a selection");
    const top = () => page.evaluate(() => document.querySelector("[data-testid=dp-table]")!.getBoundingClientRect().top);
    const before = await top();
    await page.click("[data-testid=dp-select-all]");
    await page.waitForSelector("[data-testid=dp-batch-bar]");
    const y = await page.evaluate(() => {
      const rect = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return { table: rect("[data-testid=dp-table]"), bar: rect("[data-testid=dp-batch-bar]"), pag: rect("[data-testid=dp-pagination]") };
    });
    assertEquals(await top(), before, "table did not move when the bulk bar appeared");
    assert(y.bar.top >= y.table.bottom - 0.5, `bulk bar below the table (bar ${y.bar.top} / table bottom ${y.table.bottom})`);
    assert(y.pag.top >= y.bar.bottom - 0.5, "pagination is below the bulk bar");
    await page.screenshot({ path: "runtime/theme/bulk-bar.png" });
    await page.click("[data-testid=dp-batch-clear]");
    await page.waitForSelector("[data-testid=dp-batch-bar]", { state: "detached" });
    assertEquals(await top(), before, "table still in place after clearing");
  } finally {
    await browser.close();
    const found = await api.get(`/api/res?res=user.index&username=${name}`);
    if (found.data.rows?.[0]) await api.post("/api/res/remove", { res: "user.index", ids: [found.data.rows[0].id] });
  }
} });
