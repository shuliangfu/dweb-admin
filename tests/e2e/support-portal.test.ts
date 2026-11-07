/// <reference lib="dom" />
/**
 * FE/mobile support entry polish — backend chrome still hosts /chat;
 * guest portal pages are static routes (smoke via fetch when servers up).
 * Framework: @dreamer/test.
 */
import { describe, expect, it } from "@dreamer/test";
import { browserLoggedIn, ensureServer, BASE } from "../helpers.ts";

describe("support portal (browser)", () => {
  it("admin top-header exposes chat toggle that opens CS app route", async () => {
    await ensureServer();
    const { browser, ctx } = await browserLoggedIn();
    try {
      const page = await ctx.newPage();
      await page.goto(BASE + "/");
      await page.waitForSelector("[data-testid=chat-toggle]");
      await page.goto(BASE + "/chat");
      await page.waitForSelector("[data-testid=web-chat]");
      expect(await page.locator("[data-testid=web-chat]").count()).toBe(1);
    } finally {
      await browser.close();
    }
  }, { timeout: 60000, sanitizeOps: false, sanitizeResources: false });
});
