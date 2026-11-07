/**
 * CS multi-agent claim helpers (MVP).
 * marker: CS_CLAIM_TABS_MVP
 */
import { describe, expect, it } from "@dreamer/test";
import { isCsSessionUnclaimed } from "@common/service/cs.ts";

describe("cs claim helpers", () => {
  it("unclaimed when claimedByAdminId empty/missing", () => {
    expect(isCsSessionUnclaimed({})).toBe(true);
    expect(isCsSessionUnclaimed({ claimedByAdminId: null })).toBe(true);
    expect(isCsSessionUnclaimed({ claimedByAdminId: "" })).toBe(true);
    expect(isCsSessionUnclaimed({ claimedByAdminId: "   " })).toBe(true);
  });
  it("claimed when admin id present", () => {
    expect(isCsSessionUnclaimed({ claimedByAdminId: "adm1" })).toBe(false);
  });
});
