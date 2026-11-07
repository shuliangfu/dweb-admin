/** Login gate order: password → fingerprint (if on) → two-step (if on) → enter. */
import { describe, expect, it } from "@dreamer/test";
import {
  Api,
  adminApi,
  makeUser,
  removeUser,
  totpCode,
} from "../helpers.ts";

describe("login gate", () => {
  it("password-only user enters without extra steps", async () => {
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

  it("TOTP-only user gets 2fa after password (no passkey gate)", async () => {
    const admin = await adminApi();
    const u = await makeUser(admin, ["operator"]);
    try {
      const me = new Api();
      expect((await me.login(u.username, u.password)).status).toBe(200);
      const setup = await me.post("/api/account/totp/setup");
      expect(setup.status).toBe(200);
      expect(String(setup.data.qrCode)).toMatch(/^data:image\/png;base64,/);
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
      const step2 = await l.post("/api/auth/twofactor", {
        code: await totpCode(setup.data.secret),
      });
      expect(step2.status).toBe(200);
      expect((await l.get("/api/auth/me")).status).toBe(200);
    } finally {
      await removeUser(admin, u);
    }
  }, { sanitizeOps: false, sanitizeResources: false });
});
