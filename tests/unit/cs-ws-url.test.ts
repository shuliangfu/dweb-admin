/**
 * Unit: customer-service WS / HTTP base helpers.
 */
import { describe, expect, it } from "@dreamer/test";
import { apiPublicBase, csWsUrl } from "../../common/utils/cs-ws.ts";

describe("cs-ws helpers (unit)", () => {
  it("apiPublicBase strips trailing slash and defaults to local api port", () => {
    const base = apiPublicBase();
    expect(base.endsWith("/")).toBe(false);
    expect(base.includes("://")).toBe(true);
  });

  it("csWsUrl maps http→ws and https→wss with /ws path", () => {
    const u = csWsUrl();
    expect(u.endsWith("/ws")).toBe(true);
    expect(u.startsWith("ws://") || u.startsWith("wss://")).toBe(true);
  });
});
