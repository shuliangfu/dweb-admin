/// <reference lib="dom" />
/**
 * Admin CS chat: new-window page + real WS bootstrap (wsUrl + adminWsToken).
 * Framework: @dreamer/test. Browser helper: browserLoggedIn (same as other e2e).
 */
import { describe, expect, it } from "@dreamer/test";
import { BASE, browserLoggedIn, ensureServer } from "../helpers.ts";

describe("cs chat (browser)", () => {
  it("opens /chat and bootstraps real WS tokens", async () => {
    await ensureServer();
    const { browser, ctx } = await browserLoggedIn();
    try {
      const page = await ctx.newPage();
      await page.goto(BASE + "/chat");
      await page.waitForSelector("[data-testid=web-chat]", { timeout: 10000 });
      // sessions endpoint must return wsUrl for real socket (not a fake stub)
      const boot = await page.evaluate(async () => {
        const res = await fetch("/api/chat/sessions", { credentials: "same-origin" });
        const data = await res.json();
        return {
          status: res.status,
          wsUrl: String(data.wsUrl ?? ""),
          hasToken: typeof data.adminWsToken === "string" && data.adminWsToken.length > 8,
          sessions: Array.isArray(data.sessions),
        };
      });
      expect(boot.status).toBe(200);
      expect(boot.sessions).toBe(true);
      expect(boot.hasToken).toBe(true);
      expect(boot.wsUrl).toMatch(/^wss?:\/\//);
      expect(await page.locator("[data-testid=chat-toggle]").count()).toBe(0); // no chrome on /chat
    } finally {
      await browser.close();
    }
  }, { timeout: 60000, sanitizeOps: false, sanitizeResources: false });

  it("top header chat button is present (desktop opens in-app float)", async () => {
    await ensureServer();
    const { browser, ctx } = await browserLoggedIn();
    try {
      const page = await ctx.newPage();
      await page.goto(BASE + "/");
      await page.waitForSelector("[data-testid=chat-toggle]");
      const meta = await page.locator("[data-testid=chat-toggle]").evaluate((el) => {
        // Ensure header CS entry exists; desktop opens in-app float (no browser address bar).
        return el.getAttribute("data-testid");
      });
      expect(meta).toBe("chat-toggle");
      // Soft check: /chat page still works for mobile / direct URL
      await page.goto(BASE + "/chat");
      await page.waitForSelector("[data-testid=web-chat]");
    } finally {
      await browser.close();
    }
  }, { timeout: 60000, sanitizeOps: false, sanitizeResources: false });
});
