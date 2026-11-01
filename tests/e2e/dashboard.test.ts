/// <reference lib="dom" />
/** Dashboard layout: removed cards stay removed, remaining KPI cards are aligned in tidy rows. */
import { assert, assertEquals } from "@std/assert";
import { BASE, browserLoggedIn, ensureServer } from "../helpers.ts";

Deno.test({ name: "dashboard: role / visible-menu cards are gone and remaining cards are aligned", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await ensureServer();
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    await page.goto(BASE + "/");
    await page.waitForSelector("[data-testid=dashboard]");
    assertEquals(await page.locator("[data-testid=kpi-menus],[data-testid=kpi-roles]").count(), 0, "visible-menu / current-role live cards removed");
    assertEquals(await page.locator("[data-testid=dashboard-live-kpis] > *").count(), 1, "only the admin-count live card remains");
    assertEquals(await page.locator("[data-testid=roles]").count(), 0, "current-role card removed");
    assertEquals(await page.locator("[data-testid=menu-count]").count(), 0, "visible-menu card removed");
    const body = await page.locator("[data-testid=dashboard]").innerText();
    const lines = body.split("\n").map((x) => x.trim());
    assert(!lines.includes("当前角色") && !lines.includes("可见菜单数"), "no standalone role/menu-count card text");

    const near = (a: number, b: number, msg: string) => assert(Math.abs(a - b) < 0.5, `${msg}: ${a} vs ${b}`);
    const rects = async (sel: string) => await page.locator(sel).evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }));
    for (const sel of ["[data-testid=dashboard-member-kpis] > *"]) {
      const r = await rects(sel);
      assert(r.length >= 4, `${sel}: cards rendered`);
      assert(r.every((x) => Math.abs(x.y - r[0].y) < 0.5), `${sel}: cards share one row`);
      assert(r.every((x) => Math.abs(x.h - r[0].h) < 0.5), `${sel}: equal heights`);
      assert(r.every((x) => Math.abs(x.w - r[0].w) < 0.5), `${sel}: equal widths`);
    }
    // left/right edges of both KPI rows line up with the content column
    const m = await rects("[data-testid=dashboard-member-kpis] > *");
    const l = await rects("[data-testid=dashboard-live-kpis] > *");
    near(m[0].x, l[0].x, "admin card left edge lines up with the first stat card");
    near(m[0].w, l[0].w, "admin card is as wide as a stat card");

    // ---- one shared gap token for every row: horizontal gaps inside rows and vertical gaps between rows
    const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--adm-dash-gap").trim());
    assertEquals(token, "12px");
    const gap = 12;
    const rowRects = async (sel: string) => await rects(sel);
    for (const sel of ["[data-testid=dashboard-member-kpis] > *", "[data-testid=dashboard-live-kpis] > *"]) {
      const r = await rowRects(sel);
      for (let i = 1; i < r.length; i++) near(r[i].x - (r[i - 1].x + r[i - 1].w), gap, `${sel}: horizontal gap`);
    }
    const charts = await rects("[data-testid=dashboard-charts] > *"); // [wide, narrow, full-width]
    near(charts[1].x - (charts[0].x + charts[0].w), gap, "chart row horizontal gap");
    near(charts[2].y - (charts[0].y + charts[0].h), gap, "chart rows vertical gap");
    // vertical gaps between the stacked dashboard sections
    const sections = await rects("[data-testid=dashboard] > *");
    for (let i = 1; i < sections.length; i++) {
      near(sections[i].y - (sections[i - 1].y + sections[i - 1].h), gap, `section ${i} vertical gap`);
    }
    await page.screenshot({ path: "runtime/theme/dashboard.png", fullPage: true });
  } finally {
    await browser.close();
  }
} });
