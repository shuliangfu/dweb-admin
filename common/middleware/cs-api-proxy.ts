/**
 * Same-origin proxy: FE/mobile forward /cs/*, /ui-view-upload*, and /ws → api app.
 * Browser guests use location.host for WS; this middleware upgrades + bridges to api.
 * Upstream target is env API_PUBLIC_BASE / APP_PORT_API (server-side only).
 */
import { getEnv } from "@common/utils/env.ts";

function apiUpstream(): string {
  const configured = getEnv("API_PUBLIC_BASE")?.replace(/\/$/, "");
  if (configured) return configured;
  const port = getEnv("APP_PORT_API");
  const host = getEnv("APP_HOST") ?? "127.0.0.1";
  if (port) return `http://${host}:${port}`;
  return `http://${host}:8813`;
}

function apiWsUpstream(search: string): string {
  const http = apiUpstream();
  const base = http.startsWith("https://")
    ? `wss://${http.slice("https://".length)}`
    : http.startsWith("http://")
    ? `ws://${http.slice("http://".length)}`
    : `ws://${http}`;
  return `${base.replace(/\/$/, "")}/ws${search || ""}`;
}

function shouldProxy(pathname: string): boolean {
  return pathname === "/cs" || pathname.startsWith("/cs/") ||
    pathname === "/ui-view-upload" || pathname.startsWith("/ui-view-upload/") ||
    pathname === "/ws";
}

// deno-lint-ignore no-explicit-any
type Ctx = any;

type UpgradePair = { socket: WebSocket; response: Response };

function upgradeClient(req: Request): UpgradePair | null {
  const DenoRef = (globalThis as {
    Deno?: {
      upgradeWebSocket?: (request: Request) => UpgradePair;
    };
  }).Deno;
  if (typeof DenoRef?.upgradeWebSocket !== "function") return null;
  try {
    return DenoRef.upgradeWebSocket(req);
  } catch (e) {
    console.error("[cs-api-proxy] upgradeWebSocket failed", e);
    return null;
  }
}

/** Bridge browser WS ↔ api /ws (binary + text). */
function bridgeSockets(client: WebSocket, upstreamUrl: string): void {
  const pending: Array<string | ArrayBufferLike | Blob> = [];
  let upstream: WebSocket | null = null;
  let upstreamOpen = false;

  const flush = () => {
    if (!upstream || !upstreamOpen) return;
    while (pending.length) {
      const item = pending.shift()!;
      try {
        upstream.send(item);
      } catch {
        break;
      }
    }
  };

  try {
    upstream = new WebSocket(upstreamUrl);
  } catch (e) {
    console.error("[cs-api-proxy] upstream WebSocket open failed", upstreamUrl, e);
    try {
      client.close(1011, "upstream unreachable");
    } catch {
      /* ignore */
    }
    return;
  }
  upstream.binaryType = "arraybuffer";

  upstream.addEventListener("open", () => {
    upstreamOpen = true;
    flush();
  });
  upstream.addEventListener("message", (ev) => {
    if (client.readyState !== WebSocket.OPEN) return;
    try {
      client.send(ev.data);
    } catch {
      /* ignore */
    }
  });
  upstream.addEventListener("close", (ev) => {
    upstreamOpen = false;
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.close(ev.code || 1000, ev.reason || "");
      }
    } catch {
      /* ignore */
    }
  });
  upstream.addEventListener("error", () => {
    try {
      if (client.readyState === WebSocket.OPEN) client.close(1011, "upstream error");
    } catch {
      /* ignore */
    }
  });

  client.addEventListener("message", (ev) => {
    if (upstreamOpen && upstream && upstream.readyState === WebSocket.OPEN) {
      try {
        upstream.send(ev.data);
      } catch {
        /* ignore */
      }
    } else {
      pending.push(ev.data);
    }
  });
  client.addEventListener("close", () => {
    try {
      upstream?.close();
    } catch {
      /* ignore */
    }
  });
  client.addEventListener("error", () => {
    try {
      upstream?.close();
    } catch {
      /* ignore */
    }
  });
}

/**
 * dweb AppMiddleware: short-circuit matching paths by setting ctx.response.
 */
export async function csApiProxyMiddleware(
  ctx: Ctx,
  next: () => Promise<void>,
): Promise<void> {
  const pathname = String(ctx.url?.pathname ?? ctx.path ?? "");
  if (!shouldProxy(pathname)) {
    await next();
    return;
  }

  const req = ctx.request as Request;
  const url = ctx.url as URL;
  const isWsUpgrade = req.headers.get("upgrade")?.toLowerCase() === "websocket";

  // Same-origin /ws → bridge to api WebSocket.
  if (pathname === "/ws") {
    if (!isWsUpgrade) {
      ctx.response = new Response("WebSocket endpoint", { status: 426 });
      return;
    }
    const upgraded = upgradeClient(req);
    if (!upgraded) {
      ctx.response = new Response("WebSocket upgrade unsupported", { status: 500 });
      return;
    }
    const target = apiWsUpstream(url.search);
    bridgeSockets(upgraded.socket, target);
    ctx.response = upgraded.response;
    return;
  }

  // Non-WS paths should not be upgrade leftovers.
  if (isWsUpgrade) {
    await next();
    return;
  }

  const upstream = apiUpstream();
  const target = `${upstream}${pathname}${url.search}`;
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  const init: RequestInit & { duplex?: string } = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }
  try {
    const res = await fetch(target, init);
    const outHeaders = new Headers(res.headers);
    outHeaders.delete("content-encoding");
    outHeaders.delete("transfer-encoding");
    outHeaders.delete("connection");
    ctx.response = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  } catch (e) {
    console.error("[cs-api-proxy]", target, e);
    ctx.response = new Response(
      JSON.stringify({ error: "bad_gateway", message: "api upstream unreachable" }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}
