import { describe, expect, it } from "@dreamer/test";
import {
  canonicalGuestContact,
  guestContactKey,
} from "../../common/utils/cs-contact.ts";
import {
  compareCsLobbyRows,
  dedupeCsLobbyRowsByContact,
  pickCanonicalCsLobbyRow,
  sortCsLobbyRows,
} from "../../common/utils/cs-session-list.ts";

describe("guestContactKey / canonical", () => {
  it("lowercases emails and compact phones", () => {
    expect(guestContactKey("Admin@ShuLiangFu.ME")).toBe("admin@shuliangfu.me");
    expect(canonicalGuestContact("Admin@ShuLiangFu.ME")).toBe(
      "admin@shuliangfu.me",
    );
    expect(guestContactKey("+86-138-0013-8000")).toBe("+8613800138000");
    expect(guestContactKey("访客")).toBe("");
  });
});

describe("cs lobby sort + dedupe", () => {
  it("online group then offline; within band updatedAt desc (new msg → band top)", () => {
    const rows = [
      { id: "1", guestName: "a@b.com", online: false, updatedAt: "2026-11-07T12:00:00.000Z" },
      { id: "2", guestName: "c@d.com", online: true, updatedAt: "2026-11-07T10:00:00.000Z" },
      { id: "3", guestName: "e@f.com", online: true, updatedAt: "2026-11-07T11:00:00.000Z" },
      { id: "4", guestName: "g@h.com", online: false, updatedAt: "2026-11-07T13:00:00.000Z" },
    ];
    const sorted = sortCsLobbyRows(rows);
    expect(sorted.map((r) => r.id)).toEqual(["3", "2", "4", "1"]);
    expect(compareCsLobbyRows(rows[1]!, rows[0]!)).toBeLessThan(0);
  });

  it("dedupes same email keeping online/freshest", () => {
    const rows = [
      {
        id: "old",
        guestName: "admin@shuliangfu.me",
        online: false,
        updatedAt: "2026-11-07T10:41:00.000Z",
      },
      {
        id: "new",
        guestName: "Admin@shuliangfu.me",
        online: true,
        updatedAt: "2026-11-07T10:52:00.000Z",
      },
      {
        id: "com",
        guestName: "admin@shuliangfu.com",
        online: false,
        updatedAt: "2026-11-07T10:50:00.000Z",
      },
    ];
    const out = dedupeCsLobbyRowsByContact(rows);
    expect(out.length).toBe(2);
    expect(out.find((r) => guestContactKey(r.guestName) === "admin@shuliangfu.me")?.id)
      .toBe("new");
    expect(out[0]!.online).toBe(true); // online first
  });

  it("does not merge invalid contacts", () => {
    const rows = [
      { id: "1", guestName: "（无联系方式）", updatedAt: "2026-11-07T10:00:00.000Z" },
      { id: "2", guestName: "（无联系方式）", updatedAt: "2026-11-07T11:00:00.000Z" },
    ];
    expect(dedupeCsLobbyRowsByContact(rows).length).toBe(2);
  });

  it("pickCanonical prefers claimed when tied", () => {
    const keep = pickCanonicalCsLobbyRow([
      {
        id: "a",
        guestName: "a@b.com",
        online: false,
        updatedAt: "2026-11-07T10:00:00.000Z",
      },
      {
        id: "b",
        guestName: "a@b.com",
        online: false,
        claimedByAdminId: "admin1",
        updatedAt: "2026-11-07T10:00:00.000Z",
      },
    ]);
    expect(keep.id).toBe("b");
  });
});
