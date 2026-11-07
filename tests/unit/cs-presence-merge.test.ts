/**
 * Presence merge helpers — hard refresh must not demote live greens;
 * short offline stays listed (gray), not dropped.
 * marker: PRESENCE_LIVE_V4_UNIT
 */
import { describe, expect, it } from "@dreamer/test";
import {
  CS_IDLE_HIDE_MS,
  shouldAutoHideCsSession,
  shouldHealStaleCsHide,
  isManualHiddenCsSession,
} from "@common/service/cs.ts";

function row(partial: Record<string, unknown>) {
  return {
    guestTokenHash: "x",
    guestName: "a@b.com",
    status: "open" as const,
    ...partial,
  };
}

/** Mirror WebChat keepGreen online merge (presence-live-v4). */
function mergeOnline(
  prevOnline: boolean | undefined,
  sOnline: boolean | undefined,
  opts: { soft?: boolean; wsLive?: boolean },
): boolean | undefined {
  const keepGreen = !!opts.soft || !!opts.wsLive;
  return sOnline === true ||
      (keepGreen && prevOnline === true) ||
      (!keepGreen && sOnline === undefined && prevOnline === true)
    ? true
    : (sOnline !== undefined ? sOnline : prevOnline);
}

describe("presence merge keepGreen", () => {
  it("soft poll never demotes green→gray", () => {
    expect(mergeOnline(true, false, { soft: true })).toBe(true);
  });
  it("wsLive never demotes green→gray", () => {
    expect(mergeOnline(true, false, { wsLive: true })).toBe(true);
  });
  it("hard first paint trusts HTTP online true", () => {
    expect(mergeOnline(undefined, true, {})).toBe(true);
  });
  it("hard first paint trusts HTTP online false", () => {
    expect(mergeOnline(undefined, false, {})).toBe(false);
  });
  it("HTTP online true upgrades prev false even on soft", () => {
    expect(mergeOnline(false, true, { soft: true })).toBe(true);
  });
});

describe("short offline keep (server)", () => {
  const now = Date.now();
  it("offline + idle < 24h → not auto-hide", () => {
    expect(
      shouldAutoHideCsSession(
        row({
          guestOnline: false,
          lastMessageAt: new Date(now - 60_000),
        }),
        now,
      ),
    ).toBe(false);
  });
  it("manual hide never healed", () => {
    expect(
      isManualHiddenCsSession(
        row({ hiddenAt: new Date(now - 1000), hideSource: "manual" }),
      ),
    ).toBe(true);
    expect(
      shouldHealStaleCsHide(
        row({
          hiddenAt: new Date(now - 1000),
          hideSource: "manual",
          lastMessageAt: new Date(now - 1000),
        }),
        now,
      ),
    ).toBe(false);
  });
  it("idle hide under 24h heals (short offline keep)", () => {
    expect(
      shouldHealStaleCsHide(
        row({
          hiddenAt: new Date(now - 60_000),
          hideSource: "idle",
          lastMessageAt: new Date(now - 60_000),
        }),
        now,
      ),
    ).toBe(true);
  });
  it("CS_IDLE_HIDE_MS is 24h", () => {
    expect(CS_IDLE_HIDE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
