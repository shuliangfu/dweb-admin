/**
 * Unit: customer-service WS / HTTP base helpers.
 */
import { describe, expect, it } from "@dreamer/test";
import {
  apiPublicBase,
  csWsUrl,
  httpBaseToWsUrl,
  resolveGuestWsUrl,
} from "../../common/utils/cs-ws.ts";

describe("cs-ws helpers (unit)", () => {
  it("apiPublicBase strips trailing slash and defaults to local api port", () => {
    const base = apiPublicBase();
    expect(base.endsWith("/")).toBe(false);
    expect(base.includes("://")).toBe(true);
  });

  it("csWsUrl maps http→ws and https→wss with /ws path", () => {
    const u = csWsUrl();
    expect(u.endsWith("/ws") || u === "/ws").toBe(true);
    expect(
      u.startsWith("ws://") || u.startsWith("wss://") || u.startsWith("/"),
    ).toBe(true);
  });

  it("csWsUrl prefers X-Forwarded-Host (page origin) over api public base", () => {
    const req = new Request("http://127.0.0.1:8813/cs/open", {
      headers: {
        "x-forwarded-host": "127.0.0.1:8812",
        "x-forwarded-proto": "http",
      },
    });
    expect(csWsUrl(req)).toBe("ws://127.0.0.1:8812/ws");
  });

  it("httpBaseToWsUrl maps absolute http(s); empty relative stays empty", () => {
    expect(httpBaseToWsUrl("http://127.0.0.1:8813")).toBe("ws://127.0.0.1:8813/ws");
    expect(httpBaseToWsUrl("https://api.example.com/")).toBe("wss://api.example.com/ws");
    expect(httpBaseToWsUrl("")).toBe("");
  });

  it("resolveGuestWsUrl same-origin ignores foreign absolute open wsUrl", () => {
    // No document.location in Deno test → empty apiBase yields "" (page helper empty).
    const r = resolveGuestWsUrl({
      openWsUrl: "ws://127.0.0.1:8813/ws",
      apiBase: "",
    });
    // Must NOT keep hardcoded api port when same-origin.
    expect(r.includes(":8813")).toBe(false);
  });

  it("resolveGuestWsUrl maps absolute apiBase", () => {
    expect(resolveGuestWsUrl({
      openWsUrl: "",
      apiBase: "http://127.0.0.1:8813",
    })).toBe("ws://127.0.0.1:8813/ws");
  });
});
