import { describe, expect, it } from "@dreamer/test";
import { parseSessionId, roomOf } from "../../common/service/cs.ts";

describe("cs room helpers", () => {
  it("roomOf / parseSessionId round trip", () => {
    const id = "abc12345XYZ";
    expect(roomOf(id)).toBe("cs:abc12345XYZ");
    expect(parseSessionId(roomOf(id))).toBe(id);
  });

  it("parseSessionId rejects bad rooms", () => {
    expect(parseSessionId("market:x")).toBe(null);
    expect(parseSessionId("cs:")).toBe(null);
    expect(parseSessionId("cs:short")).toBe(null);
    expect(parseSessionId("cs:bad id!!")).toBe(null);
  });
});
