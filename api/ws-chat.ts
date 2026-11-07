/**
 * Customer-service WebSocket chat.
 * Mounted on the api app same port at `/ws`.
 * Auth: admin `?adminToken=` / guest `?guestToken=`.
 * Rooms: `cs:{sessionId}`. Frames: join / leave / chat (mirrors douwanjia protocol shape).
 */

import { getWebSocketServer, type App } from "@dreamer/dweb";
import { upgradeWebSocket } from "@dreamer/runtime-adapter";
import {
  authMiddleware,
  type Socket,
  type Server as WsServer,
} from "@dreamer/websocket";
import { adminFromToken } from "@common/service/auth.ts";
import {
  canJoinCsSession,
  CS_MAX_TEXT,
  CS_MIN_SEND_GAP_MS,
  guestFromToken,
  parseSessionId,
  sendCsChat,
  type CsChatView,
} from "@common/service/cs.ts";
import { getEnv } from "@common/utils/env.ts";

type Actor =
  | { kind: "admin"; id: string; name: string }
  | { kind: "guest"; id: string; name: string; sessionId: string };

function envInt(name: string, fallback: number): number {
  const raw = getEnv(name);
  const n = raw == null || raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

const WS_MAX_CONNECTIONS = envInt("WS_MAX_CONNECTIONS", 5000);
const WS_MAX_PER_IP = envInt("WS_MAX_PER_IP", 200);
const ipCounts = new Map<string, number>();
let liveCount = 0;

function clientIp(socket: Socket): string {
  const raw = socket.handshake.address ?? "";
  return raw.split(",")[0].trim() || "unknown";
}

function onClosed(socket: Socket, fn: () => void): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    try {
      fn();
    } catch (e) {
      console.error("[ws-cs] close handler failed", e);
    }
  };
  const raw = socket.getRawSocket() as unknown as
    | { addEventListener?: (t: string, l: () => void) => void; readyState?: number }
    | undefined;
  if (raw?.addEventListener) {
    raw.addEventListener("close", run);
    raw.addEventListener("error", run);
    if (raw.readyState === 3) run();
  }
  socket.on("disconnect", run);
}

function readQuery(socket: Socket): Record<string, string> {
  const q = socket.handshake.query ?? {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
  }
  return out;
}

function refreshHandshakeHeaders(socket: Socket): void {
  const raw = socket.handshake?.headers;
  try {
    if (raw && typeof (raw as Headers).entries === "function") {
      const entries = [...(raw as Headers).entries()];
      (socket.handshake as { headers: Headers }).headers = new Headers(entries);
      return;
    }
  } catch {
    // fall through
  }
  (socket.handshake as { headers: Headers }).headers = new Headers();
}

function csAllowedOrigins(): string[] {
  const ports = new Set<string>([
    getEnv("APP_PORT_BACKEND") ?? "3100",
    getEnv("APP_PORT_FRONTEND") ?? "3001",
    getEnv("APP_PORT_API") ?? "3003",
    getEnv("APP_PORT_MOBILE") ?? "3002",
    getEnv("HOST_PORT_BACKEND") ?? "",
    getEnv("HOST_PORT_FRONTEND") ?? "",
    getEnv("HOST_PORT_API") ?? "",
    getEnv("HOST_PORT_MOBILE") ?? "",
    // Common local docker publish ports used by deploy.sh claim().
    "3000", "3001", "3002", "3003", "3004", "3005", "3100",
  ]);
  const hosts = ["127.0.0.1", "localhost"];
  const out: string[] = [];
  for (const h of hosts) {
    for (const port of ports) {
      if (!port) continue;
      out.push(`http://${h}:${port}`);
      out.push(`https://${h}:${port}`);
    }
  }
  const pub = getEnv("API_PUBLIC_BASE")?.replace(/\/$/, "");
  if (pub?.startsWith("http://") || pub?.startsWith("https://")) {
    try {
      const u = new URL(pub);
      out.push(`${u.protocol}//${u.host}`);
    } catch {
      // ignore
    }
  }
  return [...new Set(out)];
}

function patchHandleUpgradeOrigins(ws: WsServer): void {
  const allowedOrigins = csAllowedOrigins();
  const self = ws as unknown as {
    options: { maxConnections?: number; lang?: string };
    sockets: Map<string, unknown>;
    matchNamespaceForPath: (pathname: string) => unknown;
    ensureAdapterSync: () => void;
    setupSocketAfterUpgrade: (
      socket: unknown,
      handshake: unknown,
      matchedNamespace: unknown,
      pathname: string,
    ) => Promise<void>;
    toUpgradeResponse: (response: Response) => Response;
  };

  ws.handleUpgrade = (request: Request): Response => {
    let pathname = "";
    let handshake: {
      query: Record<string, string>;
      headers: Headers;
      address?: string;
      url: string;
    };
    try {
      const url = new URL(request.url);
      pathname = url.pathname;
      handshake = {
        query: Object.fromEntries(url.searchParams.entries()),
        headers: request.headers,
        address: request.headers.get("x-forwarded-for") || undefined,
        url: request.url,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return new Response(`WebSocket upgrade failed: ${errMsg}`, { status: 400 });
    }

    const matchedNamespace = self.matchNamespaceForPath(pathname);
    if (!matchedNamespace) {
      return new Response("Not Found", { status: 404 });
    }

    if (
      self.options.maxConnections &&
      self.sockets.size >= self.options.maxConnections
    ) {
      return new Response("Too Many Connections", { status: 503 });
    }

    self.ensureAdapterSync();

    let upgradeResult: ReturnType<typeof upgradeWebSocket>;
    try {
      upgradeResult = upgradeWebSocket(request, { allowedOrigins });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[ws-cs] upgrade rejected:", errMsg);
      return new Response(`WebSocket upgrade failed: ${errMsg}`, { status: 500 });
    }

    const { socket, response } = upgradeResult;
    if (!response) {
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
    queueMicrotask(() => {
      void self.setupSocketAfterUpgrade(
        socket,
        handshake,
        matchedNamespace,
        pathname,
      );
    });
    return self.toUpgradeResponse(response);
  };
  console.log("[ws-cs] handleUpgrade Origin allow:", allowedOrigins.join(", "));
}

let _csWsReady = false;
export function registerCsChatWs(app: App): void {
  if (_csWsReady) return;
  if (!app.container.has("websocketServer")) {
    console.error("[ws-cs] websocketServer missing; CS chat WS not registered");
    return;
  }
  const ws = getWebSocketServer(app.container);
  _csWsReady = true;
  patchHandleUpgradeOrigins(ws);
  console.log("[ws-cs] customer-service handlers registered on /ws");

  ws.use((socket, next) => {
    refreshHandshakeHeaders(socket);
    next();
  });

  ws.use(
    authMiddleware(async (socket) => {
      const query = readQuery(socket);
      const adminToken = query["adminToken"] ?? "";
      if (adminToken) {
        const admin = await adminFromToken(adminToken);
        if (!admin) return false;
        socket.data.actor = {
          kind: "admin",
          id: admin.id,
          name: admin.nickname || admin.username || "admin",
        } satisfies Actor;
        return true;
      }
      const guestToken = query["guestToken"] ?? "";
      const guest = await guestFromToken(guestToken);
      if (!guest) return false;
      socket.data.actor = {
        kind: "guest",
        id: guest.sessionId,
        name: guest.guestName,
        sessionId: guest.sessionId,
      } satisfies Actor;
      return true;
    }),
  );

  ws.use((socket, next) => {
    const ip = clientIp(socket);
    if (WS_MAX_CONNECTIONS > 0 && liveCount >= WS_MAX_CONNECTIONS) {
      return next(new Error("too many connections"));
    }
    const n = ipCounts.get(ip) ?? 0;
    if (WS_MAX_PER_IP > 0 && n >= WS_MAX_PER_IP) {
      return next(new Error("too many connections from ip"));
    }
    ipCounts.set(ip, n + 1);
    liveCount += 1;
    let released = false;
    onClosed(socket, () => {
      if (released) return;
      released = true;
      liveCount = Math.max(0, liveCount - 1);
      const left = (ipCounts.get(ip) ?? 1) - 1;
      if (left <= 0) ipCounts.delete(ip);
      else ipCounts.set(ip, left);
    });
    next();
  });

  ws.on("connection", (socket) => {
    const actor = socket.data.actor as Actor | undefined;
    if (!actor) {
      socket.disconnect();
      return;
    }

    socket.emit("connected", {
      role: actor.kind,
      message: "ok",
    });

    socket.on("join", async (data: { room?: string }, cb?: (r: unknown) => void) => {
      const room = String(data?.room ?? "");
      const sessionId = parseSessionId(room);
      if (!sessionId) {
        cb?.({ ok: false, message: "房间无效" });
        return;
      }
      const guestSid = actor.kind === "guest" ? actor.sessionId : undefined;
      if (!(await canJoinCsSession(actor.kind, sessionId, guestSid))) {
        cb?.({ ok: false, message: "无权进入" });
        socket.emit("error", { message: "无权进入该客服会话" });
        return;
      }
      socket.join(room);
      const joined = (socket.data.rooms as Set<string> | undefined) ?? new Set();
      joined.add(room);
      socket.data.rooms = joined;
      socket.emit("joined", { room, sessionId });
      cb?.({ ok: true, room, sessionId });
    });

    socket.on("leave", (data: { room?: string }, cb?: (r: unknown) => void) => {
      const room = String(data?.room ?? "");
      if (room) {
        socket.leave(room);
        (socket.data.rooms as Set<string> | undefined)?.delete(room);
      }
      cb?.({ ok: true });
    });

    socket.on(
      "chat",
      async (
        data: { room?: string; text?: string },
        cb?: (r: unknown) => void,
      ) => {
        const room = String(data?.room ?? "");
        const sessionId = parseSessionId(room);
        const text = String(data?.text ?? "").trim();
        if (!sessionId) {
          cb?.({ ok: false, message: "房间无效" });
          return;
        }
        if (!text || text.length > CS_MAX_TEXT) {
          cb?.({ ok: false, message: "内容无效" });
          return;
        }
        const now = Date.now();
        const last = Number(socket.data.lastChatAt ?? 0);
        if (now - last < CS_MIN_SEND_GAP_MS) {
          cb?.({ ok: false, message: "发送过快" });
          socket.emit("error", { message: "发送过快，请稍后再试" });
          return;
        }
        socket.data.lastChatAt = now;

        const joined = socket.data.rooms as Set<string> | undefined;
        if (!joined?.has(room)) {
          cb?.({ ok: false, message: "请先加入房间" });
          return;
        }

        const guestSid = actor.kind === "guest" ? actor.sessionId : undefined;
        if (!(await canJoinCsSession(actor.kind, sessionId, guestSid))) {
          cb?.({ ok: false, message: "无权发送" });
          return;
        }

        const result = await sendCsChat(
          {
            id: actor.id,
            name: actor.name,
            role: actor.kind === "admin" ? "admin" : "guest",
          },
          sessionId,
          text,
        );
        if (typeof result === "string") {
          cb?.({ ok: false, message: result });
          socket.emit("error", { message: result });
          return;
        }
        const msg: CsChatView = result.message;
        const payload = {
          room,
          id: msg.id,
          fromName: msg.fromName,
          fromRole: msg.fromRole,
          fromId: msg.fromId,
          text: msg.text,
          time: msg.time,
        };
        void ws.emitToRoom(room, "chat", payload);
        socket.emit("chat", payload);
        cb?.({ ok: true, message: payload });
      },
    );

    onClosed(socket, () => {
      socket.data.rooms = undefined;
      socket.data.actor = undefined;
    });
  });
}
