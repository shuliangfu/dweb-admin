/// <reference lib="dom" />
/** Light-mode chrome really renders #1e293b for navbar, logo area and sidebar in the browser (computed style). */
import { assert, assertEquals } from "@std/assert";
import { BASE, browserLoggedIn, ensureServer } from "../helpers.ts";

const RGB = "rgb(30, 41, 59)"; // #1e293b

const TAB_PAGES = ["/rbac/admins", "/rbac/roles", "/developer/menus", "/system/online"];

/** Open several tabs (cookie-backed), come back to the dashboard and assert tabs are flush with one shared border. */
async function openTabsAndCheckFlush(page: any, dark: boolean) {
  for (const p of TAB_PAGES) {
    await page.goto(BASE + p);
    await page.waitForSelector("[data-testid=tag-view]");
  }
  await page.goto(BASE + "/");
  await page.waitForSelector("[data-testid=dashboard]");
  await page.waitForTimeout(500);
  const items = await page.evaluate(() => {
    return [...document.querySelectorAll(".adm-tag-item")].map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return { x: r.x, right: r.right, y: r.y, ml: cs.marginLeft, mr: cs.marginRight, bl: cs.borderLeftWidth, br: cs.borderRightWidth };
    });
  });
  // the first tab starts exactly where the page content starts (one shared --adm-content-pad)
  const lefts = await page.evaluate(() => ({
    tab: document.querySelector(".adm-tag-item")!.getBoundingClientRect().x,
    heading: document.querySelector("[data-testid=dashboard] h1")!.getBoundingClientRect().x,
    pad: getComputedStyle(document.documentElement).getPropertyValue("--adm-content-pad").trim(),
  }));
  assertEquals(lefts.pad, "10px");
  assertEquals(lefts.tab, lefts.heading, `first tab left == content left (${dark ? "dark" : "light"})`);
  assert(items.length >= 4, `several tabs are open (${items.length}) in ${dark ? "dark" : "light"}`);
  for (let i = 0; i < items.length; i++) {
    assertEquals(items[i].mr, "0px", "no right margin gap");
    assertEquals(items[i].y, items[0].y, "tabs share one baseline");
    if (i > 0) {
      // neighbours overlap by exactly their 1px border => a single line, never a gap and never a double line
      assertEquals(Math.round((items[i - 1].right - items[i].x) * 100) / 100, 1, `tab ${i} overlaps the previous border by 1px (${dark ? "dark" : "light"})`);
      assertEquals(items[i].ml, "-1px");
    }
  }
}

Deno.test({ name: "theme: light navbar == logo area == sidebar == #1e293b in the browser", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await ensureServer();
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    // simulate a browser that persisted the previous defaults: they must NOT win over the new colour
    await page.addInitScript(() => {
      localStorage.setItem("dweb-admin-theme-other", JSON.stringify({ topBg: "#0f172a", brandStrip: "#0f172a" }));
      localStorage.setItem("dweb-admin-theme", "light");
    });
    await openTabsAndCheckFlush(page, false);
    const bg = await page.evaluate(() => {
      const c = (s: string) => getComputedStyle(document.querySelector(s)!).backgroundColor;
      return { nav: c(".adm-top-header"), logo: c(".adm-side-brand"), side: c(".adm-side"), dark: document.documentElement.classList.contains("dark") };
    });
    assertEquals(bg.dark, false);
    assertEquals(bg.nav, RGB);
    assertEquals(bg.logo, RGB);
    assertEquals(bg.side, RGB);
    await page.screenshot({ path: "runtime/theme/light.png" });
  } finally {
    await browser.close();
  }
}});

Deno.test({ name: "theme: dark navbar == logo area == sidebar == #0f172a in the browser", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await ensureServer();
  const { browser, ctx } = await browserLoggedIn();
  try {
    const page = await ctx.newPage();
    // a browser that persisted the old dark sidebar default must not keep it
    await page.addInitScript(() => {
      localStorage.setItem("dweb-admin-theme-other", JSON.stringify({ side: "#020617", sub: "#020617" }));
      localStorage.setItem("dweb-admin-theme", "dark");
    });
    await ctx.addCookies([{ name: "dweb-admin-theme", value: "dark", url: BASE }]);
    await openTabsAndCheckFlush(page, true);
    const bg = await page.evaluate(() => {
      const c = (s: string) => getComputedStyle(document.querySelector(s)!).backgroundColor;
      return { nav: c(".adm-top-header"), logo: c(".adm-side-brand"), side: c(".adm-side"), dark: document.documentElement.classList.contains("dark") };
    });
    assertEquals(bg.dark, true);
    const RGB_DARK = "rgb(15, 23, 42)"; // #0f172a
    assertEquals(bg.nav, RGB_DARK);
    assertEquals(bg.logo, RGB_DARK);
    assertEquals(bg.side, RGB_DARK);
    await page.screenshot({ path: "runtime/theme/dark.png" });
  } finally {
    await browser.close();
  }
}});

Deno.test({ name: "theme: DataPanel body is slightly darker in dark mode only, via one token, on every panel page", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await ensureServer();
  const pages = ["/user", "/user/active", "/user/zombie", "/cms/article", "/cms/news", "/cms/notice", "/cms/photo", "/developer/database", "/developer/feedback", "/developer/language", "/developer/system", "/system/region", "/rbac/admins", "/rbac/roles", "/rbac/permissions", "/developer/menus"];
  for (const dark of [false, true]) {
    const { browser, ctx } = await browserLoggedIn();
    try {
      if (dark) await ctx.addCookies([{ name: "dweb-admin-theme", value: "dark", url: BASE }]);
      const page = await ctx.newPage();
      const seen = new Set<string>();
      for (const p of pages) {
        await page.goto(BASE + p);
        await page.waitForSelector("[data-testid=data-panel]");
        const r = await page.evaluate(() => {
          const panel = document.querySelector("[data-testid=data-panel]") as HTMLElement;
          const head = panel.querySelector(".adm-card-header") as HTMLElement;
          return {
            panel: getComputedStyle(panel).backgroundColor,
            head: getComputedStyle(head).backgroundColor,
            token: getComputedStyle(document.documentElement).getPropertyValue("--adm-panel-body-bg").trim(),
          };
        });
        seen.add(r.panel);
        if (dark) {
          assertEquals(r.token, "#18212f");
          assertEquals(r.panel, "rgb(24, 33, 47)", `${p}: dark panel body`);
          assert(r.head !== r.panel, `${p}: title bar must stay distinguishable from the body`);
        } else {
          assert(r.panel !== "rgb(24, 33, 47)", `${p}: light mode must not get the dark body colour`);
        }
      }
      assertEquals(seen.size, 1, `one colour for every panel page (${dark ? "dark" : "light"})`);
      if (dark) {
        await page.goto(BASE + "/user");
        await page.waitForSelector("[data-testid=dp-table]");
        await page.waitForTimeout(500);
        await page.screenshot({ path: "runtime/theme/panel-dark.png" });
      }
    } finally {
      await browser.close();
    }
  }
} });
