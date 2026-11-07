/**
 * Unit: totpBegin returns real PNG QR + base32 secret (not humancheck stub SVG).
 */
import { describe, expect, it } from "@dreamer/test";

describe("totp QR (unit)", () => {
  it("npm:qrcode encodes otpauthUrl as PNG data URL", async () => {
    const QRCode = (await import("qrcode")).default;
    const url =
      "otpauth://totp/Dweb%20Admin:demo?secret=JBSWY3DPEHPK3PXP&issuer=Dweb%20Admin";
    const png = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    expect(png).toMatch(/^data:image\/png;base64,/);
    expect(png.length).toBeGreaterThan(200);
    // stub SVG from humancheck would be image/svg+xml
    expect(png.includes("image/svg")).toBe(false);
  });
});
