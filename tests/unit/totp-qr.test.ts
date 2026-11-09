/**
 * Unit: TOTP setup returns otpauthUrl for client-side @dreamer/ui-view <QRCode>
 * (no npm:qrcode PNG). Rendering is covered by e2e totp-setup; this file stays
 * free of ui-view imports so Bun/Node can resolve without jsr: jsx-runtime.
 */
import { describe, expect, it } from "@dreamer/test";
import { createTotp } from "@dreamer/humancheck";

describe("totp QR (unit)", () => {
  it("humancheck returns otpauthUrl for ui-view <QRCode>", () => {
    const totp = createTotp({ issuer: "Dweb Admin", digits: 6, period: 30, window: 1 });
    const r = totp.generateSecret("demo");
    expect(r.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(r.secret).toMatch(/^[A-Z2-7]{16,}$/);
    expect(r.otpauthUrl).toContain("Dweb");
  });
});
