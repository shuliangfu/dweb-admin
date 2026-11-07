/**
 * Customer-service WebSocket chat.
 * Mounted on the api app same port at `/ws`.
 * Auth: admin `?adminToken=` / guest `?guestToken=`.
 * Rooms: `cs:{sessionId}`. Frames: join / leave / chat (mirrors douwanjia protocol shape).
 */

import { getWebSocketServer, type App } from "@dreamer/dweb";
import { isDatabaseInitialized } from "@dreamer/database";
import { upgradeWebSocket } from "@dreamer/runtime-adapter";
import {
  authMiddleware,
  type Socket,
  type Server as WsServer,
} from "@dreamer/websocket";
import { adminFromToken } from "@common/service/auth.ts";
import { hasPermission } from "@common/service/rbac.ts";
import {
  canJoinCsSession,
  CS_IDLE_HIDE_MS,
  CS_LOBBY_ROOM,
  CS_MAX_TEXT,
  CS_MIN_SEND_GAP_MS,
  csSessionIdleMs,
  getCsLobbyRowsByIds,
  guestFromToken,
  clearCsSessionHidden,
  hideCsSession,
  isManualHiddenCsSession,
  parseSessionId,
  shouldHealStaleCsHide,
  previewForKind,
  publishCsSession,
  resetAllCsGuestOnline,
  setCsGuestOnline,
  setCsLobbyPublisher,
  sendCsChat,
  type CsChatView,
  type CsSendPayload,
  type CsSessionRow,
} from "@common/service/cs.ts";
import type { CsMediaMeta, CsMessageKind } from "@common/models/mod.ts";
import { getEnv } from "@common/utils/env.ts";
import { localCorsOrigins } from "@common/utils/local-origins.ts";

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
  return localCorsOrigins();
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
      const badOrigin = request.headers.get("origin") ?? "(none)";
      console.error("[ws-cs] upgrade rejected:", errMsg, "origin=", badOrigin);
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
}

/**
 * Guest presence refcount (per sessionId).
 * A Set alone races on reconnect: new socket marks online, then the old
 * socket's close handler marks offline and sticks guestOnline=false in Mongo
 * while the guest is still connected — admin refresh then shows gray dots.
 */
const onlineGuestCounts = new Map<string, number>();

function isGuestOnline(sessionId: string): boolean {
  return (onlineGuestCounts.get(sessionId) ?? 0) > 0;
}

/** @returns true when this socket is the first live connection for sid. */
function retainGuestOnline(sessionId: string): boolean {
  const n = (onlineGuestCounts.get(sessionId) ?? 0) + 1;
  onlineGuestCounts.set(sessionId, n);
  return n === 1;
}

/** @returns true when no live sockets remain for sid (now offline). */
function releaseGuestOnline(sessionId: string): boolean {
  const cur = onlineGuestCounts.get(sessionId) ?? 0;
  if (cur <= 1) {
    onlineGuestCounts.delete(sessionId);
    return cur > 0;
  }
  onlineGuestCounts.set(sessionId, cur - 1);
  return false;
}

function onlineGuestIds(): string[] {
  return [...onlineGuestCounts.entries()]
    .filter(([, n]) => n > 0)
    .map(([id]) => id);
}

/** Live guest session ids in this api process (HTTP hard-load merge). */
export function getCsOnlineGuestIds(): string[] {
  return onlineGuestIds();
}


function sessionSortIso(
  row: {
    lastMessageAt?: Date | string;
    updatedAt?: Date | string;
  } | null | undefined,
): string {
  const raw = row?.lastMessageAt ?? row?.updatedAt;
  if (!raw) return new Date().toISOString();
  const t = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString();
}

async function publishGuestOnline(
  sid: string,
  actorName: string,
  row: {
    guestName?: string;
    status?: string;
    lastPreview?: string;
    lastMessageAt?: Date | string;
    updatedAt?: Date | string;
    claimedByAdminId?: string | null;
    claimedByName?: string | null;
    claimedAt?: Date | string | null;
  } | null,
): Promise<void> {
  const claimedBy = row?.claimedByAdminId
    ? String(row.claimedByAdminId).trim()
    : "";
  publishCsSession(lobbyRow({
    id: sid,
    guestName: actorName || row?.guestName || "",
    status: row?.status || "open",
    lastPreview: row?.lastPreview ?? "",
    online: true,
    hidden: false,
    // Presence must not bump last-message sort key.
    updatedAt: sessionSortIso(row),
    claimedByAdminId: claimedBy || null,
    claimedByName: claimedBy
      ? (String(row?.claimedByName ?? "").trim() || null)
      : null,
    claimedAt: claimedBy && row?.claimedAt
      ? (row.claimedAt instanceof Date
        ? row.claimedAt.toISOString()
        : String(row.claimedAt))
      : null,
  }));
}

/**
 * Retain presence once per socket. Safe to call from connect + join.
 * Optional sessionId overrides actor.sessionId (join room path).
 */
async function attachGuestPresence(
  socket: Socket,
  actor: Extract<Actor, { kind: "guest" }>,
  sessionId?: string,
): Promise<void> {
  const sid = String(sessionId ?? actor.sessionId ?? "").trim();
  if (!sid) return;
  socket.data.guestSessionId = sid;
  if (socket.data.guestPresenceOn === true) {
    // Already counted this socket — still heal Mongo + re-announce online.
    const row = await setCsGuestOnline(sid, true);
    if (!row) return;
    await publishGuestOnline(sid, actor.name, row);
    return;
  }
  socket.data.guestPresenceOn = true;
  retainGuestOnline(sid);
  const row = await setCsGuestOnline(sid, true);
  if (!row) {
    // Hard-deleted mid-flight — undo retain.
    socket.data.guestPresenceOn = false;
    releaseGuestOnline(sid);
    return;
  }
  // Always publish online (first or heal) so lobby / soft-poll stay green.
  await publishGuestOnline(sid, actor.name, row);
}

async function detachGuestPresence(
  socket: Socket,
  actor: Extract<Actor, { kind: "guest" }>,
): Promise<void> {
  const sid = String(
    socket.data.guestSessionId ?? actor.sessionId ?? "",
  ).trim();
  if (!sid) return;
  if (socket.data.guestPresenceOn !== true) return;
  socket.data.guestPresenceOn = false;
  const nowOffline = releaseGuestOnline(sid);
  if (!nowOffline) return; // another live socket still holds presence
  const row = await setCsGuestOnline(sid, false);
  // Hard-deleted → drop signal only.
  if (!row) {
    publishCsSession(lobbyRow({
      id: sid,
      guestName: actor.name,
      status: "open",
      online: false,
      hidden: true,
      updatedAt: new Date().toISOString(),
    }));
    return;
  }
  // Short offline must stay listed (grayscale). Drop only when:
  //  - admin manual hide, or
  //  - idle ≥ 24h (auto-hide).
  // Heal stale idle/legacy hiddenAt under the 24h gate so reconnect-visible
  // sessions do not vanish the moment the socket closes.
  let drop = false;
  if (isManualHiddenCsSession(row)) {
    drop = true;
  } else if (csSessionIdleMs(row) >= CS_IDLE_HIDE_MS) {
    await hideCsSession(sid, "idle");
    drop = true;
  } else if (shouldHealStaleCsHide(row)) {
    await clearCsSessionHidden(sid);
    drop = false;
  }
  publishCsSession(lobbyRow({
    id: sid,
    guestName: actor.name || row.guestName || "",
    status: "open",
    lastPreview: row.lastPreview ?? "",
    online: false,
    hidden: drop,
    updatedAt: sessionSortIso(row),
  }));
}

/**
 * Push currently-online guests to one admin socket (reload / reconnect hydrate).
 * Memory refcount is source of truth — emit synthetic rows first (no Mongo wait)
 * so admin refresh goes green even when guestOnline was cleared by boot reset race.
 * Then enrich from Mongo and heal stale guestOnline=false for soft-poll / hard load.
 */
async function emitPresenceSnapshot(socket: Socket): Promise<void> {
  const ids = onlineGuestIds();
  if (!ids.length) return;
  const now = new Date().toISOString();
  // Phase 1: instant online flags only (do NOT blank guestName / claim —
  // client upsert must keep prior claimedBy* across hard-refresh hydrate).
  for (const id of ids) {
    socket.emit("session", {
      id,
      online: true,
      hidden: false,
      updatedAt: now,
    });
  }
  // Phase 2: enrich names/preview + heal Mongo so HTTP list agrees with live sockets.
  try {
    const rows = await getCsLobbyRowsByIds(ids);
    const seen = new Set<string>();
    for (const row of rows) {
      seen.add(row.id);
      socket.emit("session", {
        ...row,
        online: true,
        hidden: false,
      });
      void setCsGuestOnline(row.id, true);
    }
    for (const id of ids) {
      if (!seen.has(id)) void setCsGuestOnline(id, true);
    }
  } catch (e) {
    console.error("[ws-cs] presence snapshot failed", e);
    for (const id of ids) void setCsGuestOnline(id, true);
  }
}

function lobbyRow(
  partial: Partial<CsSessionRow> & { id: string },
): CsSessionRow {
  return {
    id: partial.id,
    guestName: (partial.guestName && partial.guestName.trim()) || "",
    status: partial.status ?? "open",
    lastPreview: partial.lastPreview ?? "",
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
    online: partial.online,
    hidden: partial.hidden,
    claimedByAdminId: partial.claimedByAdminId,
    claimedByName: partial.claimedByName,
    claimedAt: partial.claimedAt,
  };
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
  setCsLobbyPublisher((row) => {
    void ws.emitToRoom(CS_LOBBY_ROOM, "session", row);
  });
  // Api process restart drops all WS sockets — clear stale guestOnline so
  // backend soft-poll / admin refresh do not show ghost greens.
  // IMPORTANT: EventEmitter "start" runs BEFORE lifecycle "starting" (DB connect).
  // Wait for isDatabaseInitialized() first — never race model before initDatabase.
  void (async () => {
    for (let i = 0; i < 80; i++) {
      if (isDatabaseInitialized()) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!isDatabaseInitialized()) {
      console.error(
        "[ws-cs] guestOnline boot reset skipped: database still not initialized",
      );
      return;
    }
    for (let i = 0; i < 40; i++) {
      const n = await resetAllCsGuestOnline();
      if (n >= 0) {
        for (const id of onlineGuestIds()) {
          void setCsGuestOnline(id, true);
        }
        console.log("[ws-cs] guestOnline boot reset ok", n);
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    console.error("[ws-cs] guestOnline boot reset gave up");
  })();
  console.log("[ws-cs] customer-service handlers registered on /ws (presence-live-v4)");

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
        if (!await hasPermission(admin.roleCodes, "cs.view")) return false;
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

    // Admins auto-join lobby for live session list / presence.
    if (actor.kind === "admin") {
      socket.join(CS_LOBBY_ROOM);
      const joined0 = (socket.data.rooms as Set<string> | undefined) ?? new Set();
      joined0.add(CS_LOBBY_ROOM);
      socket.data.rooms = joined0;
      // Rehydrate live presence from this api process (source of truth), not
      // only Mongo — covers admin refresh while guests stay connected.
      void emitPresenceSnapshot(socket);
    }

    // Guest presence on connect (not only join): title may show「已连接」before
    // room join; lobby / soft-poll must still see them immediately.
    if (actor.kind === "guest") {
      void attachGuestPresence(socket, actor);
    }

    socket.on("join", async (data: { room?: string }, cb?: (r: unknown) => void) => {
      const room = String(data?.room ?? "");
      // Explicit lobby join (admin only) — same as auto-join.
      if (room === CS_LOBBY_ROOM) {
        if (actor.kind !== "admin") {
          cb?.({ ok: false, message: "无权进入" });
          return;
        }
        socket.join(room);
        const joinedL = (socket.data.rooms as Set<string> | undefined) ?? new Set();
        joinedL.add(room);
        socket.data.rooms = joinedL;
        socket.emit("joined", { room, sessionId: "" });
        cb?.({ ok: true, room });
        void emitPresenceSnapshot(socket);
        return;
      }
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
      if (actor.kind === "guest") {
        // Idempotent for this socket — connect already retained when possible.
        await attachGuestPresence(socket, actor, sessionId);
      }
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
        data: {
          room?: string;
          text?: string;
          kind?: string;
          media?: CsMediaMeta;
        },
        cb?: (r: unknown) => void,
      ) => {
        const room = String(data?.room ?? "");
        const sessionId = parseSessionId(room);
        const text = String(data?.text ?? "").trim();
        const kind = (String(data?.kind ?? "text").trim().toLowerCase() ||
          "text") as CsMessageKind;
        const media = data?.media;
        if (!sessionId) {
          cb?.({ ok: false, message: "房间无效" });
          return;
        }
        // text/emoji still capped; media kinds may have empty text
        const needsText = kind === "text" || kind === "emoji";
        if (needsText && (!text || text.length > CS_MAX_TEXT)) {
          cb?.({ ok: false, message: "内容无效" });
          return;
        }
        if (text.length > CS_MAX_TEXT) {
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

        const sendBody: CsSendPayload = { kind, text, media };
        const result = await sendCsChat(
          {
            id: actor.id,
            name: actor.name,
            role: actor.kind === "admin" ? "admin" : "guest",
          },
          sessionId,
          sendBody,
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
          kind: msg.kind ?? kind,
          media: msg.media,
        };
        void ws.emitToRoom(room, "chat", payload);
        socket.emit("chat", payload);
        cb?.({ ok: true, message: payload });
        // Keep admin list preview fresh without waiting for poll.
        publishCsSession(lobbyRow({
          id: sessionId,
          guestName: actor.kind === "guest" ? actor.name : "",
          status: "open",
          lastPreview: previewForKind(msg.kind ?? kind, msg.text ?? "", msg.media),
          updatedAt: msg.time || new Date().toISOString(),
          online: actor.kind === "guest" ? true : isGuestOnline(sessionId),
          // sendCsChat clears hiddenAt → reveal in lobby
          hidden: false,
        }));
      },
    );

    onClosed(socket, () => {
      if (actor.kind === "guest") {
        void detachGuestPresence(socket, actor);
      }
      socket.data.rooms = undefined;
      socket.data.actor = undefined;
    });
  });
}
