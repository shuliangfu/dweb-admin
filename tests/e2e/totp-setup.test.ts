/// <reference lib="dom" />
/**
 * Security settings → TOTP: scannable QR (real PNG data URL) + plaintext secret.
 * Framework: @dreamer/test. Browser helper pattern matches other e2e files.
 */
import { describe, expect, it } from "@dreamer/test";
import {
  BASE,
  adminApi,
  ensureServer,
  makeUser,
  removeUser,
} from "../helpers.ts";

describe("totp setup (browser)", () => {
  it("security modal shows PNG QR and plaintext secret", async () => {
    await ensureServer();
    const admin = await adminApi();
    const u = await makeUser(admin, ["operator"]);
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      await ctx.request.get(BASE + "/login");
      const csrf = (await ctx.cookies()).find((c) => c.name === "_csrf")?.value ?? "";
      const login = await ctx.request.post(BASE + "/api/auth/login", {
        data: JSON.stringify({ username: u.username, password: u.password }),
        headers: { "x-csrf-token": csrf, "content-type": "application/json", accept: "application/json" },
        maxRedirects: 0,
      });
      expect(login.status()).toBe(200);
      const body = await login.json();
      expect(body.ok).toBe(true);
      expect(body.status === "2fa" || body.status === "passkey").toBe(false);

      const page = await ctx.newPage();
      await page.goto(BASE + "/");
      await page.waitForSelector("[data-testid=user-menu]");
      await page.click("[data-testid=user-menu]");
      await page.waitForSelector("[data-testid=open-security]");
      await page.click("[data-testid=open-security]");
      await page.waitForSelector("[data-testid=sec-password]");
      await page.click("[data-testid=sec-tab-totp]");
      await page.waitForSelector("[data-testid=sec-totp]", { timeout: 8000 });
      // Debug dump if start button missing
      const startCount = await page.locator("[data-testid=totp-start]").count();
      if (startCount === 0) {
        const html = await page.locator("[data-testid=sec-totp]").innerHTML();
        throw new Error(`totp-start missing; sec-totp html=${html.slice(0, 500)}`);
      }
      await page.locator("[data-testid=totp-start] button").click();
      await page.waitForSelector("[data-testid=totp-qr]", { timeout: 8000 });
      await page.waitForSelector("[data-testid=totp-secret]");
      const qrSrc = await page.getAttribute("[data-testid=totp-qr]", "src");
      expect(qrSrc ?? "").toMatch(/^data:image\/png;base64,/);
      const secret = (await page.locator("[data-testid=totp-secret]").innerText()).trim();
      expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
      expect(await page.locator("[data-testid=totp-copy-secret]").count()).toBe(1);
    } finally {
      await browser.close();
      await removeUser(admin, u);
    }
  }, { timeout: 90000, sanitizeOps: false, sanitizeResources: false });
});
