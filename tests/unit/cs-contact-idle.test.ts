import { describe, expect, it } from "@dreamer/test";
import {
  CS_IDLE_HIDE_MS,
  csSessionIdleMs,
  isManualHiddenCsSession,
  shouldAutoHideCsSession,
  shouldHealStaleCsHide,
} from "../../common/service/cs.ts";
import {
  CS_GUEST_NAME_FALLBACK,
  displayGuestName,
  isValidGuestContact,
  normalizeGuestContact,
} from "../../common/utils/cs-contact.ts";
import type { CsSessionDocument } from "../../common/models/mod.ts";

describe("cs contact gate", () => {
  it("accepts phone or email", () => {
    expect(isValidGuestContact("13800138000")).toBe(true);
    expect(isValidGuestContact("+86-138-0013-8000")).toBe(true);
    expect(isValidGuestContact("a@b.co")).toBe(true);
    expect(isValidGuestContact("  user@example.com ")).toBe(true);
  });

  it("rejects empty / 访客 / garbage", () => {
    expect(isValidGuestContact("")).toBe(false);
    expect(isValidGuestContact("访客")).toBe(false);
    expect(isValidGuestContact("dig")).toBe(false);
    expect(isValidGuestContact("not-an-email")).toBe(false);
    expect(isValidGuestContact("123")).toBe(false);
  });

  it("displayGuestName never shows bare 访客", () => {
    expect(displayGuestName("访客")).toBe(CS_GUEST_NAME_FALLBACK);
    expect(displayGuestName("")).toBe(CS_GUEST_NAME_FALLBACK);
    expect(displayGuestName("13800138000")).toBe("13800138000");
    expect(normalizeGuestContact("  a @ b.com ")).toBe("a@b.com");
  });
});

describe("cs idle auto-hide", () => {
  const now = Date.parse("2026-11-07T12:00:00.000Z");

  function row(partial: Partial<CsSessionDocument>): CsSessionDocument {
    return {
      guestTokenHash: "x",
      guestName: "13800138000",
      status: "open",
      ...partial,
    };
  }

  it("online never auto-hides even when idle", () => {
    const r = row({
      guestOnline: true,
      lastMessageAt: new Date(now - CS_IDLE_HIDE_MS * 2),
    });
    expect(shouldAutoHideCsSession(r, now)).toBe(false);
  });

  it("offline + idle ≥ 24h → auto-hide", () => {
    const r = row({
      guestOnline: false,
      lastMessageAt: new Date(now - CS_IDLE_HIDE_MS),
    });
    expect(shouldAutoHideCsSession(r, now)).toBe(true);
    expect(csSessionIdleMs(r, now)).toBeGreaterThanOrEqual(CS_IDLE_HIDE_MS);
  });

  it("offline but active < 24h → keep", () => {
    const r = row({
      guestOnline: false,
      lastMessageAt: new Date(now - 12 * 60 * 60 * 1000),
    });
    expect(shouldAutoHideCsSession(r, now)).toBe(false);
  });
});

describe("cs hideSource / short offline keep", () => {
  const now = Date.parse("2026-11-07T12:00:00.000Z");

  function row(partial: Partial<CsSessionDocument>): CsSessionDocument {
    return {
      guestTokenHash: "x",
      guestName: "13800138000",
      status: "open",
      ...partial,
    };
  }

  it("manual hide is never healed", () => {
    const r = row({
      guestOnline: false,
      hiddenAt: new Date(now - 1000),
      hideSource: "manual",
      lastMessageAt: new Date(now - 60 * 1000),
    });
    expect(isManualHiddenCsSession(r)).toBe(true);
    expect(shouldHealStaleCsHide(r, now)).toBe(false);
  });

  it("idle/legacy hide under 24h → heal (short offline keep)", () => {
    const idle = row({
      guestOnline: false,
      hiddenAt: new Date(now - 1000),
      hideSource: "idle",
      lastMessageAt: new Date(now - 60 * 60 * 1000),
    });
    expect(shouldHealStaleCsHide(idle, now)).toBe(true);
    const legacy = row({
      guestOnline: false,
      hiddenAt: new Date(now - 1000),
      lastMessageAt: new Date(now - 60 * 60 * 1000),
    });
    expect(shouldHealStaleCsHide(legacy, now)).toBe(true);
  });

  it("idle hide past 24h → do not heal", () => {
    const r = row({
      guestOnline: false,
      hiddenAt: new Date(now - 1000),
      hideSource: "idle",
      lastMessageAt: new Date(now - CS_IDLE_HIDE_MS),
    });
    expect(shouldHealStaleCsHide(r, now)).toBe(false);
  });
});
