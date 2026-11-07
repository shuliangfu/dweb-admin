/**
 * Public API / WS base for customer-service chat (browser-facing).
 *
 * Guest FE/mobile: same-origin relative HTTP (/cs,/ui-view-upload) + same-origin `/ws`
 * (proxied by csApiProxyMiddleware). Browser WS must follow `location.host` —
 * never hardcode api listen port (e.g. 8813) in the client.
 *
 * Server-side absolute bases still read API_PUBLIC_BASE / APP_PORT_API for
 * direct api hits and admin bootstraps.
 */
import { getEnv } from "@common/utils/env.ts";

/** HTTP origin of the api app (no trailing slash). Empty string = same-origin relative. */
export function apiPublicBase(): string {
  const configured = getEnv("API_PUBLIC_BASE")?.replace(/\/$/, "");
  if (configured) return configured;
  // Browser: relative (page host proxies /cs,/ui-view-upload,/ws → api).
  if (typeof globalThis !== "undefined" && "document" in globalThis) {
    return "";
  }
  const port = getEnv("APP_PORT_API");
  const host = getEnv("APP_HOST") ?? "127.0.0.1";
  if (port) return `http://${host}:${port}`;
  // Last resort when env unset (SSR/tests) — still env-driven when present.
  return `http://${host}:8813`;
}

/** Map an absolute http(s) API base to ws(s)://…/ws. Empty/relative → "". */
export function httpBaseToWsUrl(httpBase: string): string {
  const http = (httpBase || "").replace(/\/$/, "");
  if (!http) return "";
  if (http.startsWith("https://")) return `wss://${http.slice("https://".length)}/ws`;
  if (http.startsWith("http://")) return `ws://${http.slice("http://".length)}/ws`;
  if (http.startsWith("wss://") || http.startsWith("ws://")) {
    return http.endsWith("/ws") ? http : `${http.replace(/\/$/, "")}/ws`;
  }
  return "";
}

/** Browser: `ws(s)://` + current page host + `/ws`. Empty outside document. */
export function pageWsUrlFromLocation(): string {
  try {
    const loc = (globalThis as {
      location?: { protocol?: string; host?: string };
    }).location;
    if (!loc?.host) return "";
    const proto = loc.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${loc.host}/ws`;
  } catch {
    return "";
  }
}

/**
 * Build CS wsUrl for a server response.
 * Prefer X-Forwarded-Host/Proto (FE/mobile proxy) so clients stay on page origin.
 * Else API_PUBLIC_BASE / APP_PORT_API for direct api / admin.
 */
export function csWsUrl(req?: Request): string {
  if (req) {
    const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const xfProto = (req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      "http").toLowerCase();
    if (xfHost) {
      const secure = xfProto === "https";
      return `${secure ? "wss" : "ws"}://${xfHost}/ws`;
    }
  }
  const http = apiPublicBase();
  if (!http) {
    // Relative mode with no request: path-only hint (client resolves via location).
    return "/ws";
  }
  return httpBaseToWsUrl(http) || `${http.replace(/^http/, "ws")}/ws`;
}

/**
 * Resolve guest WS URL for the browser.
 * Empty apiBase (FE/mobile same-origin) → always `location.host` /ws.
 * Absolute apiBase → map to ws. Relative open `/ws` → location.
 * Never keep a foreign-port absolute from open when in same-origin mode.
 */
export function resolveGuestWsUrl(opts: {
  openWsUrl?: string;
  apiBase?: string;
}): string {
  const apiBase = String(opts.apiBase ?? "").trim();
  const fromOpen = String(opts.openWsUrl ?? "").trim();

  // Same-origin guest shell: page host only (proxied /ws).
  if (!apiBase) {
    const page = pageWsUrlFromLocation();
    if (page) return page;
    if (fromOpen === "/ws" || fromOpen.startsWith("/ws?")) return fromOpen;
    return "";
  }

  const mapped = httpBaseToWsUrl(apiBase);
  if (mapped) return mapped;

  if (fromOpen.startsWith("ws://") || fromOpen.startsWith("wss://")) return fromOpen;
  if (fromOpen === "/ws" || fromOpen.startsWith("/ws?")) {
    return pageWsUrlFromLocation() || fromOpen;
  }
  return "";
}
