/**
 * Integration: password → fingerprint (if on) → 2FA (if on) → enter.
 * Uses live backend + Mongo (same helpers as api tests).
 */
import { describe, expect, it } from "@dreamer/test";
import {
  Api,
  adminApi,
  makeUser,
  removeUser,
  totpCode,
} from "../helpers.ts";

describe("login gate order (integration)", () => {
  it("skips fingerprint and 2FA when neither is enabled", async () => {
    const admin = await adminApi();
    const u = await makeUser(admin, ["operator"]);
    try {
      const a = new Api();
      const r = await a.login(u.username, u.password);
      expect(r.status).toBe(200);
      expect(r.data.status).toBeUndefined();
      expect((await a.get("/api/auth/me")).status).toBe(200);
    } finally {
      await removeUser(admin, u);
    }
  }, { sanitizeOps: false, sanitizeResources: false });

  it("password then 2FA when TOTP on and passkey off", async () => {
    const admin = await adminApi();
    const u = await makeUser(admin, ["operator"]);
    try {
      const me = new Api();
      expect((await me.login(u.username, u.password)).status).toBe(200);
      const setup = await me.post("/api/account/totp/setup");
      expect(setup.status).toBe(200);
      expect(String(setup.data.secret)).toMatch(/^[A-Z2-7]{16,}$/);
      expect(String(setup.data.otpauthUrl)).toMatch(/^otpauth:\/\/totp\//);
      expect(String(setup.data.qrCode)).toMatch(/^data:image\//);
      expect(
        (await me.post("/api/account/totp/enable", {
          code: await totpCode(setup.data.secret, Date.now() - 30000),
        })).status,
      ).toBe(200);

      const l = new Api();
      const step1 = await l.login(u.username, u.password);
      expect(step1.status).toBe(200);
      expect(step1.data.status).toBe("2fa");
      expect((await l.get("/api/auth/me")).status).toBe(401);
      expect(
        (await l.post("/api/auth/twofactor", {
          code: await totpCode(setup.data.secret),
        })).status,
      ).toBe(200);
      expect((await l.get("/api/auth/me")).status).toBe(200);
    } finally {
      await removeUser(admin, u);
    }
  }, { sanitizeOps: false, sanitizeResources: false });

  it("login page step=2fa without challenge cookie falls back to password", async () => {
    const a = new Api();
    const page = await a.get("/login?step=2fa");
    expect([200, 302].includes(page.status)).toBe(true);
    if (page.status === 200) {
      const html = String(page.data);
      // Without a live challenge, load() must not stay on the 2FA form.
      expect(html.includes('name="code"') && html.includes("twofa")).toBe(false);
    }
  }, { sanitizeOps: false, sanitizeResources: false });
});
