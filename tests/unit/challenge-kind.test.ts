/**
 * Unit: login-gate challenge kinds include passkey-gate.
 */
import { describe, expect, it } from "@dreamer/test";
import type { ChallengeKind } from "../../common/model/security.ts";

describe("challenge kinds (unit)", () => {
  it("passkey-gate is a valid ChallengeKind alongside 2fa and webauthn kinds", () => {
    const kinds: ChallengeKind[] = [
      "2fa",
      "passkey-reg",
      "passkey-login",
      "passkey-gate",
    ];
    expect(kinds).toContain("passkey-gate");
    expect(kinds).toContain("2fa");
    expect(new Set(kinds).size).toBe(4);
  });
});
