/// <reference lib="dom" />
/** Light-mode chrome really renders #1e293b for navbar, logo area and sidebar in the browser (computed style). */
import { assertEquals } from "@std/assert";
import { BASE, browserLoggedIn, ensureServer } from "../helpers.ts";

const RGB = "rgb(30, 41, 59)"; // #1e293b

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
    await page.goto(BASE + "/");
    await page.waitForSelector("[data-testid=dashboard]");
    await page.waitForTimeout(500); // after hydration + initPrimaryColor
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
