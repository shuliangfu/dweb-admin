/**
 * Customer-service chat: sessions, messages, room helpers.
 * WS rooms are `cs:{sessionId}`. Persistence is Mongo (CsSession / CsMessage).
 * Rich media: HTTP upload → WS chat meta (kind + media); no binary on WS.
 */
import {
  ChatMessage as CsMessage,
  type ChatMessageDocument as CsMessageDocument,
  type ChatMessageKind as CsMessageKind,
  type ChatMediaMeta as CsMediaMeta,
  type ChatFromRole as CsFromRole,
  ChatSession as CsSession,
  type ChatSessionDocument as CsSessionDocument,
} from "@common/models/mod.ts";
import { randomToken, sha256 } from "@common/service/password.ts";
import {
  CS_GUEST_NAME_FALLBACK,
  canonicalGuestContact,
  displayGuestName,
  guestContactKey,
  isValidGuestContact,
  normalizeGuestContact,
} from "@common/utils/cs-contact.ts";
import {
  dedupeCsLobbyRowsByContact,
  sortCsLobbyRows,
} from "@common/utils/cs-session-list.ts";
import { isDatabaseInitialized } from "@dreamer/database";
import { getEnv } from "@common/utils/env.ts";

export {
  CS_GUEST_NAME_FALLBACK,
  canonicalGuestContact,
  displayGuestName,
  guestContactKey,
  isValidGuestContact,
  normalizeGuestContact,
} from "@common/utils/cs-contact.ts";
export {
  compareCsLobbyRows,
  dedupeCsLobbyRowsByContact,
  sortCsLobbyRows,
} from "@common/utils/cs-session-list.ts";

export const CS_ROOM_PREFIX = "cs:";
/** Admin-only lobby — live session list / presence pushes. */
export const CS_LOBBY_ROOM = "cs:lobby";
export const CS_MAX_TEXT = 500;
export const CS_MIN_SEND_GAP_MS = 400;
export const CS_UPLOAD_PATH_PREFIX = "chat";
/** Auto-hide only when idle ≥ 24h AND currently offline. Online never auto-hides. */
export const CS_IDLE_HIDE_MS = 24 * 60 * 60 * 1000;


const MEDIA_KINDS: ReadonlySet<CsMessageKind> = new Set([
  "image",
  "file",
  "voice",
  "sticker",
]);

export interface CsChatView {
  id: string;
  fromName: string;
  fromRole: CsFromRole;
  fromId: string;
  text: string;
  time: string;
  kind?: CsMessageKind;
  media?: CsMediaMeta;
}

export interface CsSessionRow {
  id: string;
  guestName: string;
  status: string;
  lastPreview: string;
  updatedAt: string;
  /** Guest currently connected on WS (lobby / presence). */
  online?: boolean;
  /**
   * Lobby signal: drop this session from the admin list (hide / delete).
   * Not persisted on listCsSessions rows.
   */
  hidden?: boolean;
  /** Multi-agent claim — empty = 待认领. */
  claimedByAdminId?: string | null;
  claimedByName?: string | null;
  claimedAt?: string | null;
}

type CsLobbyPublisher = (row: CsSessionRow) => void;
let _lobbyPublisher: CsLobbyPublisher | null = null;

/** api/ws-chat registers this so HTTP open + WS join/chat can push to admin lobby. */
export function setCsLobbyPublisher(fn: CsLobbyPublisher | null): void {
  _lobbyPublisher = fn;
}

export function publishCsSession(row: CsSessionRow): void {
  try {
    _lobbyPublisher?.(row);
  } catch (e) {
    console.error("[cs] lobby publish failed", e);
  }
}

export interface CsSendPayload {
  kind?: CsMessageKind;
  text?: string;
  media?: CsMediaMeta;
}

export function roomOf(sessionId: string): string {
  return `${CS_ROOM_PREFIX}${sessionId}`;
}

/** Parse `cs:{id}` → session id, or null when invalid. */
export function parseSessionId(room: string): string | null {
  if (!room.startsWith(CS_ROOM_PREFIX)) return null;
  const id = room.slice(CS_ROOM_PREFIX.length).trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : null;
}

function asIso(d: Date | string | undefined): string {
  if (!d) return "";
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}

function normalizeKind(raw: unknown): CsMessageKind {
  const k = String(raw ?? "text").trim().toLowerCase();
  if (
    k === "text" || k === "emoji" || k === "image" || k === "file" ||
    k === "voice" || k === "sticker"
  ) {
    return k;
  }
  return "text";
}

function mapMessage(row: CsMessageDocument): CsChatView {
  const kind = normalizeKind(row.kind);
  return {
    id: String(row._id ?? ""),
    fromName: row.fromName ?? "",
    fromRole: row.fromRole,
    fromId: row.fromId ?? "",
    text: row.text ?? "",
    time: asIso(row.createdAt),
    kind: kind === "text" && !row.kind ? undefined : kind,
    media: row.media,
  };
}

export function previewForKind(
  kind: CsMessageKind,
  text: string,
  media?: CsMediaMeta,
): string {
  switch (kind) {
    case "image":
      return "[图片]";
    case "file":
      return `[文件] ${(media?.name || text || "").slice(0, 60)}`.trim();
    case "voice":
      return "[语音]";
    case "sticker":
      return text.trim() || "[贴纸]";
    case "emoji":
      return text.trim().slice(0, 80) || "[表情]";
    default:
      return text.trim().slice(0, 80);
  }
}

/**
 * Accept sticker:id, or /ui-view-upload/file?key=chat/{sessionId}/… (relative or absolute).
 * Legacy key prefix `cs/{sessionId}/` and mount `/upload/file` still accepted (Mongo 过渡).
 */
export function isAllowedCsMediaUrl(url: string, sessionId: string): boolean {
  const raw = (url ?? "").trim();
  if (!raw) return false;
  if (raw.startsWith("sticker:")) {
    return /^sticker:[A-Za-z0-9_-]{1,64}$/.test(raw);
  }
  try {
    const u = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw, "http://cs.local");
    const path = u.pathname;
    const okFile =
      path === "/ui-view-upload/file" ||
      path.endsWith("/ui-view-upload/file") ||
      path.includes("/ui-view-upload/file") ||
      // legacy mount
      path === "/upload/file" ||
      path.endsWith("/upload/file") ||
      path.includes("/upload/file");
    if (!okFile) return false;
    const key = u.searchParams.get("key") ?? "";
    if (key.includes("..")) return false;
    const sid = String(sessionId);
    // 新前缀 chat/；旧 Mongo／落盘 key 仍可能是 cs/ — 双认过渡
    const prefixes = [
      `${CS_UPLOAD_PATH_PREFIX}/${sid}/`,
      `cs/${sid}/`,
    ];
    return prefixes.some((p) => key.startsWith(p));
  } catch {
    return false;
  }
}

/**
 * Open a guest session; returns raw guestToken once (client must store it).
 * Same contact (email/phone) reuses the canonical open session — no lobby dupes.
 */
export async function createGuestSession(
  guestName?: string,
): Promise<
  | {
    ok: true;
    sessionId: string;
    guestToken: string;
    guestName: string;
    reused?: boolean;
    lobby?: CsSessionRow;
  }
  | { ok: false; message: string }
> {
  const guestToken = randomToken(24);
  const name = canonicalGuestContact(guestName ?? "");
  if (!isValidGuestContact(name)) {
    return { ok: false, message: "请填写有效的电话或邮箱" };
  }
  const key = guestContactKey(name);
  // Exact match on canonical guestName (emails lowercased on write).
  let siblings = await CsSession.findAll(
    { status: "open", guestName: name },
    undefined,
    { sort: { lastMessageAt: -1 }, limit: 40 },
  ) as unknown as CsSessionDocument[];
  // Rare: legacy mixed-case emails still in DB.
  if (siblings.length === 0 && name.includes("@") && key) {
    const recent = await CsSession.findAll(
      { status: "open" },
      undefined,
      { sort: { lastMessageAt: -1 }, limit: 200 },
    ) as unknown as CsSessionDocument[];
    siblings = recent.filter((r) => guestContactKey(r.guestName) === key);
  }
  if (siblings.length > 0) {
    const ranked = siblings.slice().sort((a, b) => {
      const oa = a.guestOnline === true ? 1 : 0;
      const ob = b.guestOnline === true ? 1 : 0;
      if (oa !== ob) return ob - oa;
      const pa = (a.lastPreview || "").trim() ? 1 : 0;
      const pb = (b.lastPreview || "").trim() ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ca = a.claimedByAdminId && String(a.claimedByAdminId).trim() ? 1 : 0;
      const cb = b.claimedByAdminId && String(b.claimedByAdminId).trim() ? 1 : 0;
      if (ca !== cb) return cb - ca;
      const ta = new Date(a.lastMessageAt || a.updatedAt || 0).getTime() || 0;
      const tb = new Date(b.lastMessageAt || b.updatedAt || 0).getTime() || 0;
      if (ta !== tb) return tb - ta;
      return String(a._id).localeCompare(String(b._id));
    });
    const keep = ranked[0]!;
    const id = String(keep._id);
    await CsSession.updateById(id, {
      guestTokenHash: await sha256(guestToken),
      guestName: name,
      // Returning guest should surface in lobby again.
      hiddenAt: null,
      hideSource: null,
    });
    const refreshed = await CsSession.findById(id) as CsSessionDocument | null;
    const lobby = mapSessionRow(refreshed ?? keep, {
      online: (refreshed ?? keep).guestOnline === true,
    });
    return {
      ok: true,
      sessionId: id,
      guestToken,
      guestName: name,
      reused: true,
      lobby,
    };
  }
  const row = await CsSession.create({
    guestTokenHash: await sha256(guestToken),
    guestName: name,
    status: "open",
    lastMessageAt: new Date(),
    lastPreview: "",
    guestOnline: false,
  }) as unknown as CsSessionDocument;
  return {
    ok: true,
    sessionId: String(row._id),
    guestToken,
    guestName: name,
    lobby: mapSessionRow(row, { online: false }),
  };
}

export async function guestFromToken(
  raw: string,
): Promise<{ sessionId: string; guestName: string } | null> {
  const token = (raw ?? "").trim();
  if (!token) return null;
  const row = await CsSession.findOne({
    guestTokenHash: await sha256(token),
  }) as CsSessionDocument | null;
  if (!row || row.status === "closed") return null;
  return { sessionId: String(row._id), guestName: displayGuestName(row.guestName) };
}

function isHiddenSession(row: CsSessionDocument | null | undefined): boolean {
  if (!row) return false;
  const h = row.hiddenAt as Date | string | null | undefined;
  if (h == null || h === "") return false;
  if (h instanceof Date) return !Number.isNaN(h.getTime());
  const t = new Date(h);
  return !Number.isNaN(t.getTime());
}

/** Admin explicit hide — offline must stay out of lobby. */
export function isManualHiddenCsSession(
  row: CsSessionDocument | null | undefined,
): boolean {
  return isHiddenSession(row) && row?.hideSource === "manual";
}

/**
 * Stale auto/legacy hide under the 24h gate — clear so short offline stays listed.
 * Manual hides are never healed here.
 */
export function shouldHealStaleCsHide(
  row: CsSessionDocument,
  now = Date.now(),
): boolean {
  if (!isHiddenSession(row)) return false;
  if (row.hideSource === "manual") return false;
  // idle / legacy (missing hideSource): heal when still under auto-hide threshold
  return !shouldAutoHideCsSession({ ...row, guestOnline: false }, now);
}

function mapSessionRow(
  r: CsSessionDocument,
  extra?: Partial<CsSessionRow>,
): CsSessionRow {
  const claimedBy = (r.claimedByAdminId && String(r.claimedByAdminId).trim()) ||
    null;
  return {
    id: String(r._id),
    guestName: displayGuestName(r.guestName),
    status: r.status,
    lastPreview: r.lastPreview ?? "",
    updatedAt: asIso(r.lastMessageAt ?? r.updatedAt),
    claimedByAdminId: claimedBy,
    claimedByName: claimedBy
      ? (String(r.claimedByName ?? "").trim() || null)
      : null,
    claimedAt: claimedBy ? (asIso(r.claimedAt as Date | string | undefined) || null) : null,
    ...extra,
  };
}

/** Unclaimed = no claimedByAdminId (待认领). */
export function isCsSessionUnclaimed(
  row: { claimedByAdminId?: string | null } | null | undefined,
): boolean {
  return !row?.claimedByAdminId || !String(row.claimedByAdminId).trim();
}

export type ClaimCsResult =
  | { ok: true; session: CsSessionRow; already?: boolean }
  | { ok: false; code: "notFound" | "conflict" | "badRequest"; message: string };

/**
 * Atomic claim write (Mongo findOneAndUpdate).
 * Only succeeds when claimedByAdminId is missing / null / "".
 * Re-read after write so hard-refresh list sees persisted assignee.
 */
export async function claimCsSessionAtomic(
  sessionId: string,
  admin: { id: string; name: string },
): Promise<ClaimCsResult> {
  const id = sessionId.trim();
  const adminId = String(admin.id ?? "").trim();
  const adminName = String(admin.name ?? "").trim() || "admin";
  if (!id || !adminId) {
    return { ok: false, code: "badRequest", message: "sessionId/admin required" };
  }

  const existing = await CsSession.findById(id) as CsSessionDocument | null;
  if (!existing || existing.status === "closed") {
    return { ok: false, code: "notFound", message: "session not found" };
  }
  const already = String(existing.claimedByAdminId ?? "").trim();
  if (already && already === adminId) {
    return {
      ok: true,
      already: true,
      session: mapSessionRow(existing, {
        online: existing.guestOnline === true,
        hidden: false,
      }),
    };
  }
  if (already && already !== adminId) {
    return {
      ok: false,
      code: "conflict",
      message: `已被 ${existing.claimedByName || "其他客服"} 认领`,
    };
  }

  const claimedAt = new Date();
  // Atomic: only one concurrent writer can match unclaimed filter.
  const updated = await CsSession.findOneAndUpdate(
    {
      _id: id,
      status: "open",
      $or: [
        { claimedByAdminId: null },
        { claimedByAdminId: { $exists: false } },
        { claimedByAdminId: "" },
      ],
    } as Record<string, unknown>,
    {
      claimedByAdminId: adminId,
      claimedByName: adminName,
      claimedAt,
    },
    { returnDocument: "after" },
  ) as CsSessionDocument | null;

  if (!updated) {
    // Lost the race — re-read for conflict / notFound message.
    const again = await CsSession.findById(id) as CsSessionDocument | null;
    if (!again || again.status === "closed") {
      return { ok: false, code: "notFound", message: "session not found" };
    }
    const who = String(again.claimedByAdminId ?? "").trim();
    if (who && who !== adminId) {
      return {
        ok: false,
        code: "conflict",
        message: `已被 ${again.claimedByName || "其他客服"} 认领`,
      };
    }
    if (who === adminId) {
      return {
        ok: true,
        already: true,
        session: mapSessionRow(again, {
          online: again.guestOnline === true,
          hidden: false,
        }),
      };
    }
    return { ok: false, code: "conflict", message: "认领失败，请重试" };
  }

  // Verify persistence (guards against silent no-op writes).
  const verified = await CsSession.findById(id) as CsSessionDocument | null;
  const persisted = String(verified?.claimedByAdminId ?? "").trim();
  if (persisted !== adminId) {
    console.error(
      "[cs] claim write did not persist",
      id,
      "want",
      adminId,
      "got",
      persisted,
    );
    return {
      ok: false,
      code: "conflict",
      message: "认领未持久化，请重试",
    };
  }

  return {
    ok: true,
    session: mapSessionRow(verified ?? updated, {
      online: (verified ?? updated).guestOnline === true,
      hidden: false,
    }),
  };
}

/**
 * Claim for current admin (MVP). Prefer queue-serialized entry from
 * `@common/service/cs-claim-queue.ts` in HTTP handlers.
 */
export async function claimCsSession(
  sessionId: string,
  admin: { id: string; name: string },
): Promise<ClaimCsResult> {
  return await claimCsSessionAtomic(sessionId, admin);
}

/** Idle duration from last activity; missing stamps count as fully idle. */
export function csSessionIdleMs(
  row: CsSessionDocument,
  now = Date.now(),
): number {
  const raw = row.lastMessageAt ?? row.updatedAt ?? row.createdAt;
  if (!raw) return Number.POSITIVE_INFINITY;
  const t = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - t);
}

/**
 * Auto-hide gate: idle ≥ 24h AND currently offline.
 * guestOnline === true → never auto-hide (even if idle).
 */
export function shouldAutoHideCsSession(
  row: CsSessionDocument,
  now = Date.now(),
): boolean {
  if (row.guestOnline === true) return false; // online → stay listed
  return csSessionIdleMs(row, now) >= CS_IDLE_HIDE_MS;
}

/** Persist guest WS presence for admin list / soft poll (cross-process). */
export async function setCsGuestOnline(
  sessionId: string,
  online: boolean,
): Promise<CsSessionDocument | null> {
  const id = sessionId.trim();
  if (!id) return null;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row) return null;
  await CsSession.updateById(id, { guestOnline: online });
  return { ...row, guestOnline: online };
}

/**
 * Clear all persisted guestOnline flags (api process boot).
 * Live sockets will re-set true on (re)connect; prevents ghost greens after restart.
 */
export async function resetAllCsGuestOnline(): Promise<number> {
  // App EventEmitter "start" fires before lifecycle "starting" (DB connect).
  // Never hit the model before init — avoids Failed to initialize / loaderNotSet noise.
  if (!isDatabaseInitialized()) return -1;
  try {
    return await CsSession.updateMany(
      { guestOnline: true },
      { guestOnline: false },
    );
  } catch (e) {
    console.error("[cs] resetAllCsGuestOnline failed", e);
    return -1; // caller may retry
  }
}

/** Lobby rows for specific session ids (admin presence snapshot). */
export async function getCsLobbyRowsByIds(
  sessionIds: string[],
): Promise<CsSessionRow[]> {
  const out: CsSessionRow[] = [];
  const seen = new Set<string>();
  for (const raw of sessionIds) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const row = await CsSession.findById(id) as CsSessionDocument | null;
    if (!row || row.status === "closed") continue;
    out.push(mapSessionRow(row, {
      online: true,
      // Online guests always appear even if manually hidden.
      hidden: false,
    }));
  }
  return out;
}

/**
 * One-shot hard-delete sessions with no phone/email contact
 * (empty / fallback / legacy「访客」). Do NOT call from listCsSessions —
 * use scripts/cs-purge-no-contact.ts only.
 * Returns number of sessions removed (messages cascade via deleteCsSession).
 */
export async function purgeCsSessionsWithoutContact(
  limit = 200,
): Promise<number> {
  const rows = await CsSession.findAll(
    {},
    undefined,
    { sort: { updatedAt: -1 }, limit },
  ) as unknown as CsSessionDocument[];
  let n = 0;
  for (const r of rows) {
    const id = String(r._id ?? "").trim();
    if (!id) continue;
    if (isValidGuestContact(r.guestName)) continue;
    try {
      const ok = await deleteCsSession(id);
      if (ok) n++;
    } catch (e) {
      console.error("[cs] purge no-contact failed", id, e);
    }
  }
  return n;
}

export async function listCsSessions(
  limit = 80,
  liveOnlineIds?: Iterable<string>,
): Promise<CsSessionRow[]> {
  // Pull extra then filter in JS — hidden / auto-hide / online exceptions.
  // liveOnlineIds = api-process memory (source of truth while WS up); Mongo
  // guestOnline can lag after boot reset — treat live ids as online for filter.
  const live = new Set(
    [...(liveOnlineIds ?? [])].map((id) => String(id ?? "").trim()).filter(Boolean),
  );
  const rows = await CsSession.findAll(
    { status: "open" },
    undefined,
    { sort: { lastMessageAt: -1 }, limit: Math.max(limit * 3, 120) },
  ) as unknown as CsSessionDocument[];
  const now = Date.now();
  const out: CsSessionRow[] = [];
  for (const r of rows) {
    let row = r;
    const id = String(row._id ?? "");
    const online = row.guestOnline === true || live.has(id);
    // Heal stale idle/legacy hide when still under 24h — short offline must stay listed.
    if (!online && shouldHealStaleCsHide(row, now)) {
      try {
        await CsSession.updateById(String(row._id), {
          hiddenAt: null,
          hideSource: null,
        });
        row = { ...row, hiddenAt: null, hideSource: null };
      } catch (e) {
        console.error("[cs] heal stale hide failed", row._id, e);
      }
    }
    // Dual-condition auto-hide: idle ≥ 24h AND offline. Online stays listed.
    if (!online && !isHiddenSession(row) && shouldAutoHideCsSession(row, now)) {
      try {
        await CsSession.updateById(String(row._id), {
          hiddenAt: new Date(),
          hideSource: "idle",
        });
      } catch (e) {
        console.error("[cs] auto-hide failed", row._id, e);
      }
      continue;
    }
    // Manual (or still-valid idle) hide + offline → stay out; hide + online → visible.
    if (isHiddenSession(row) && !online) continue;
    out.push(mapSessionRow(row, { online }));
  }
  // Same contact → one lobby row (keep online / claimed / freshest).
  // Online-first sort (all green before all gray); then updatedAt desc.
  const deduped = dedupeCsLobbyRowsByContact(out);
  return sortCsLobbyRows(deduped).slice(0, limit);
}

export async function getCsDetail(sessionId: string): Promise<{
  session: CsSessionRow | null;
  messages: CsChatView[];
}> {
  const id = sessionId.trim();
  if (!id) return { session: null, messages: [] };
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row) return { session: null, messages: [] };
  const msgs = await CsMessage.findAll(
    { sessionId: id },
    undefined,
    { sort: { createdAt: 1 }, limit: 200 },
  ) as unknown as CsMessageDocument[];
  return {
    session: {
      id: String(row._id),
      guestName: displayGuestName(row.guestName),
      status: row.status,
      lastPreview: row.lastPreview ?? "",
      updatedAt: asIso(row.lastMessageAt ?? row.updatedAt),
    },
    messages: msgs.map(mapMessage),
  };
}

export async function canJoinCsSession(
  kind: "admin" | "guest",
  sessionId: string,
  guestSessionId?: string,
): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return false;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row || row.status === "closed") return false;
  if (kind === "admin") return true;
  return guestSessionId === id;
}

export async function sendCsChat(
  from: { id: string; name: string; role: CsFromRole },
  sessionId: string,
  payload: string | CsSendPayload,
): Promise<string | { message: CsChatView }> {
  const p: CsSendPayload = typeof payload === "string"
    ? { kind: "text", text: payload }
    : payload ?? {};
  const kind = normalizeKind(p.kind ?? "text");
  const text = String(p.text ?? "").trim();
  const media = p.media;

  if (kind === "text" || kind === "emoji") {
    if (!text || text.length > CS_MAX_TEXT) return "内容无效";
  } else if (kind === "sticker") {
    if (!text && !media?.url) return "内容无效";
    if (media?.url && !isAllowedCsMediaUrl(media.url, sessionId)) {
      return "媒体地址无效";
    }
  } else if (MEDIA_KINDS.has(kind)) {
    if (!media?.url || !media?.mime) return "媒体无效";
    if (!isAllowedCsMediaUrl(media.url, sessionId)) return "媒体地址无效";
    if (text.length > CS_MAX_TEXT) return "内容无效";
  } else {
    return "内容无效";
  }

  const id = sessionId.trim();
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row || row.status === "closed") return "会话不存在";

  const doc: Record<string, unknown> = {
    sessionId: id,
    fromId: from.id,
    fromName: from.name,
    fromRole: from.role,
    text: text || (kind === "sticker" ? "" : ""),
    kind,
  };
  if (media && (MEDIA_KINDS.has(kind) || kind === "sticker")) {
    doc.media = {
      url: media.url,
      mime: media.mime,
      name: media.name,
      size: media.size,
      width: media.width,
      height: media.height,
      durationMs: media.durationMs,
      thumbUrl: media.thumbUrl,
    };
  }

  const created = await CsMessage.create(doc) as unknown as CsMessageDocument;
  const touch: Record<string, unknown> = {
    lastMessageAt: new Date(),
    lastPreview: previewForKind(kind, text, media),
  };
  // Any new message reveals a previously hidden session back into the lobby.
  if (isHiddenSession(row)) {
    touch.hiddenAt = null;
    touch.hideSource = null;
  }
  await CsSession.updateById(id, touch);
  return { message: mapMessage(created) };
}

/** True when session exists and has hiddenAt set. */
export async function isCsSessionHidden(sessionId: string): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return false;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  return isHiddenSession(row);
}

/**
 * True when the session should stay out of the admin lobby:
 * hard-deleted (row missing) OR soft-hidden (hiddenAt set).
 * Guest disconnect / presence must not revive a deleted id.
 */
export async function shouldDropCsSessionFromLobby(
  sessionId: string,
): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return true;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row) return true;
  return isHiddenSession(row);
}

/**
 * Clear hiddenAt so the session reappears in the admin list.
 * Returns true when a hidden flag was actually cleared.
 */
export async function clearCsSessionHidden(sessionId: string): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return false;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row || !isHiddenSession(row)) return false;
  await CsSession.updateById(id, { hiddenAt: null, hideSource: null });
  return true;
}

/**
 * Hide from admin lobby list; keep session + messages.
 * Guest rejoin / new chat clears the flag.
 */
export async function hideCsSession(
  sessionId: string,
  source: "manual" | "idle" = "manual",
): Promise<CsSessionRow | null> {
  const id = sessionId.trim();
  if (!id) return null;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row || row.status === "closed") return null;
  await CsSession.updateById(id, { hiddenAt: new Date(), hideSource: source });
  return mapSessionRow(row, {
    hidden: true,
    // Keep last-message sort key — do not bump on hide.
    updatedAt: asIso(row.lastMessageAt ?? row.updatedAt) ||
      new Date().toISOString(),
  });
}


/**
 * Remove on-disk media for a session under LOCAL_DIR (CS_UPLOAD_DIR || ./uploads).
 * Clears pathPrefix `chat/{sid}` and legacy `cs/{sid}`. Disk failures are logged only
 * (Mongo row must not stay as an orphan after a successful delete).
 */
async function purgeCsSessionUploads(sessionId: string): Promise<void> {
  const id = sessionId.trim();
  if (!id) return;
  // Reject path traversal — session ids are opaque tokens / ObjectIds.
  if (id.includes("/") || id.includes("\\") || id.includes("..")) {
    console.error("[cs] purge uploads refused unsafe sessionId", id);
    return;
  }
  const localDir = (getEnv("CS_UPLOAD_DIR") || "./uploads").replace(/\/+$/, "");
  for (const prefix of [CS_UPLOAD_PATH_PREFIX, "cs"] as const) {
    const dir = `${localDir}/${prefix}/${id}`;
    try {
      await Deno.remove(dir, { recursive: true });
    } catch (e) {
      const err = e as { name?: string; code?: string };
      if (err?.name === "NotFound" || err?.code === "ENOENT") continue;
      console.error("[cs] purge uploads failed", dir, e);
    }
  }
}

/**
 * Permanently delete session + all messages + on-disk uploads/chat|cs/{sid}.
 */
export async function deleteCsSession(sessionId: string): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return false;
  const row = await CsSession.findById(id) as CsSessionDocument | null;
  if (!row) return false;
  // 1) messages first 2) session row 3) disk (fail → log only; no orphan session)
  try {
    await CsMessage.deleteMany({ sessionId: id });
  } catch (e) {
    console.error("[cs] delete messages failed", id, e);
    // Still remove the session row so the lobby drop sticks.
  }
  const n = await CsSession.deleteById(id);
  if (!n) {
    // Race / already gone — treat as success when findById saw it.
    const again = await CsSession.findById(id) as CsSessionDocument | null;
    if (again) return false;
  }
  await purgeCsSessionUploads(id);
  return true;
}
