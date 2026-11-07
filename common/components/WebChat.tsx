/**
 * WebChat — shared CS chat core (唯一聊天核心 — 勿再复制三套).
 * Owns: message list + composer + WS + green「已连接」+ rich media toolbar.
 * 连接状态：仅标题旁绿点／文案 DOM patch；聊天区连接系统消息零插入／零渲染
 * （Modal [data-modal-title-status] 或内头 [data-webchat-title-status]），禁 title signal。
 * Rich media: text / emoji / sticker / image / file / voice.
 * Upload: HTTP thin fetch (webchat-upload) → WS chat meta (no binary on WS).
 * Shells only wrap layout / open-close (FE float / mobile page / backend 三壳).
 * marker: WEBCHAT_RICH_MEDIA_20261107 + COMPOSER_TEXTAREA_FOCUS_FIX + CONTACT_GATE_FOCUS_FIX + SESSION_SWIPE_HIDE_DEL_V7_DELETE_FIX + LINK_STATUS_SYSMSG_ALL + HIDE_HEADER + FETCH_GUARD + COMPOSER_PASTE_IMAGE_PREVIEW_INLINE + IMAGE_VIEWER + BUBBLE_META_GAP_PX + GUEST_AVATAR_GRAYSCALE + IDLE_HIDE_24H + OFFLINE_KEEP_GRAY + LIST_SORT_ONLINE_FIRST_DEDUPE + UPLOAD_OPTIMISTIC_BUBBLE + PREVIEW_INLINE_CURSOR + PRESENCE_LIVE_V4 + CLAIM_TABS_MVP + IMAGE_SCROLL_AFTER_LOAD + PANE_FIXED_HEIGHT_SCROLL + IME_COMPOSING_ENTER + FE_UPLOAD_HMR_IGNORE
 */
import { createEffect, createSignal, onCleanup, onMount, Portal, untrack } from "@dreamer/view";
import {
  Badge,
  Button,
  ContextMenu,
  Empty,
  IconEyeOff,
  IconSmile,
  IconImage,
  IconMic,
  IconPaperClip,
  IconTrash,
  IconUserPlus,
  ImageViewer,
  Popconfirm,
  Stack,
  Tabs,
  Text,
} from "@dreamer/ui-view";
import { Client } from "@dreamer/websocket/client";
import { WebchatUploadClient } from "@common/utils/webchat-upload.ts";
import { apiPublicBase, resolveGuestWsUrl } from "@common/utils/cs-ws.ts";
import {
  isValidGuestContact,
  normalizeGuestContact,
} from "@common/utils/cs-contact.ts";
import { dedupeCsLobbyRowsByContact } from "@common/utils/cs-session-list.ts";
import { guestAvatarMeta } from "@common/utils/cs-avatar.ts";
import { api } from "@common/utils/client-api.ts";
import { toast as uiToast } from "@dreamer/ui-view/feedback";
import type { CsMediaMeta, CsMessageKind } from "@common/models/mod.ts";

/** Local alias — avoid barrel TDZ / client bind loss (same pattern as _layout). */
const toast = uiToast;
import {
  WEBCHAT_EMOJI,
  WEBCHAT_STICKERS,
  stickerById,
} from "@common/components/webchat-stickers.ts";

export type CsMode = "admin" | "guest";

interface SessionRow {
  id: string;
  guestName: string;
  status: string;
  lastPreview: string;
  updatedAt: string;
  online?: boolean;
  /** Lobby: drop from list (hide / delete). */
  hidden?: boolean;
  /** Multi-agent claim — empty = 待认领. */
  claimedByAdminId?: string | null;
  claimedByName?: string | null;
  claimedAt?: string | null;
}

type ClaimTabKey = "mine" | "pending";

interface ChatMsg {
  id: string;
  fromName: string;
  fromRole?: string;
  text: string;
  time: string;
  mine?: boolean;
  kind?: CsMessageKind;
  media?: CsMediaMeta;
  /** Centered business tip only (never link status); not a chat bubble. */
  system?: boolean;
  /** Optimistic media send: bubble shows mask until echo / failure. */
  uploadStatus?: "uploading" | "failed";
  uploadError?: string;
}

type PanelKind = "none" | "picker";
type PickerTab = "emoji" | "sticker";
type PreviewKind = "image" | "file" | "voice";

interface LocalPreview {
  kind: PreviewKind;
  file?: File;
  blobUrl: string;
  name: string;
  mime: string;
  size: number;
  durationMs?: number;
}

function roomOf(id: string): string {
  return `cs:${id}`;
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatBytes(n: number): string {
  if (!n || n < 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtName(name: string): string {
  const base = String(name || "").split(/[/\\]/).pop() || "";
  const i = base.lastIndexOf(".");
  if (i <= 0) return "";
  return base.slice(i).toLowerCase();
}

/** Short size label for status tips (5MB / 512KB / 200B). */
function humanSizeCap(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0B";
  if (n >= 1024 * 1024) {
    const mb = n / (1024 * 1024);
    return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`;
  }
  if (n >= 1024) {
    const kb = n / 1024;
    return Number.isInteger(kb) ? `${kb}KB` : `${kb.toFixed(1)}KB`;
  }
  return `${Math.round(n)}B`;
}


function formatDuration(ms?: number): string {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Map upload/virus/HTTP failures to short Chinese for bubble + toast. */
function friendlyUploadError(err: unknown): string {
  const raw = err instanceof Error
    ? err.message
    : typeof err === "string"
    ? err
    : "上传失败";
  const s = String(raw || "");
  const lower = s.toLowerCase();
  if (
    /malware|virus|infected|CONTENT_REJECTED|content.?rejected|clam/i.test(s) ||
    lower.includes("malware detected")
  ) {
    return "图片未通过安全检测，请更换后重试";
  }
  if (/\b422\b/.test(s) || /unprocessable/i.test(s)) {
    return "图片被拒绝（422），请更换后重试";
  }
  if (/\b413\b/.test(s) || /too large|entity too large/i.test(s)) {
    return "图片过大，请压缩后重试";
  }
  if (/\b401\b|\b403\b|unauthorized|forbidden|csrf/i.test(s)) {
    return "上传鉴权失败，请刷新后重试";
  }
  if (/network|failed to fetch|abort|timeout/i.test(s)) {
    return "网络异常，上传失败";
  }
  // Strip noisy "upload HTTP NNN: {json}" prefix when possible.
  const m = s.match(/upload HTTP \d+:\s*(.*)$/i);
  if (m?.[1]) {
    try {
      const j = JSON.parse(m[1]) as { message?: string; error?: string; code?: string };
      if (j.message) return friendlyUploadError(j.message);
      if (j.error && /reject|malware|forbidden/i.test(String(j.error))) {
        return friendlyUploadError(String(j.error));
      }
    } catch {
      /* keep */
    }
  }
  if (s.length > 80) return "上传失败，请稍后重试";
  return s || "上传失败";
}


/** Extract first image/* File from a paste event (screenshot / copied image). */
function fileFromClipboard(ev: ClipboardEvent): File | null {
  const items = ev.clipboardData?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || it.kind !== "file") continue;
      if (!it.type.startsWith("image/")) continue;
      const f = it.getAsFile();
      if (!f) continue;
      if (f.name && f.name.trim()) return f;
      const t = (it.type || f.type || "image/png").toLowerCase();
      const ext = t === "image/jpeg" || t === "image/jpg"
        ? "jpg"
        : t === "image/webp"
        ? "webp"
        : t === "image/gif"
        ? "gif"
        : "png";
      return new File([f], `paste-${Date.now()}.${ext}`, {
        type: f.type || it.type || "image/png",
      });
    }
  }
  const files = ev.clipboardData?.files;
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f && f.type.startsWith("image/")) return f;
    }
  }
  return null;
}

/** Map browser audio/* → video/* so upload magic (webm/mp4) passes primary-type check. */
function uploadMimeFor(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m === "audio/webm") return "video/webm";
  if (m === "audio/mp4") return "video/mp4";
  return m || "application/octet-stream";
}

function mediaAbsUrl(
  apiBase: string,
  url: string,
  token: string,
  asAdmin = false,
): string {
  if (!url) return "";
  if (url.startsWith("sticker:")) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  const qKey = asAdmin ? "adminToken" : "guestToken";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const u = new URL(url);
    if (token && !u.searchParams.get("guestToken") && !u.searchParams.get("adminToken")) {
      u.searchParams.set(qKey, token);
    }
    return u.toString();
  }
  const base = apiBase.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  // Same-origin relative (empty apiBase): resolve against page origin when available.
  const origin =
    base ||
    (("location" in globalThis &&
        (globalThis as { location?: { origin?: string } }).location?.origin) ||
      "http://127.0.0.1");
  const u = new URL(path, origin.endsWith("/") ? origin : origin + "/");
  // When base was empty, keep path-absolute (same-origin) form for img/src fetch.
  if (!base) {
    if (token) u.searchParams.set(qKey, token);
    return `${u.pathname}${u.search}`;
  }
  if (token) u.searchParams.set(qKey, token);
  return u.toString();
}

function patchClientNoInboundEcho(client: Client): void {
  type Msg = {
    type?: string;
    event?: string;
    data?: unknown;
    callbackId?: string;
  };
  const c = client as unknown as {
    handleMessage: (data: unknown) => void;
    parseMessage: (data: unknown) => Promise<Msg>;
    handlePong: () => void;
    send: (message: unknown) => Promise<void>;
    emit: (event: string, data?: unknown, cb?: (r: unknown) => void) => void;
    listeners: Map<string, Array<(data?: unknown) => void>>;
  };
  const notify = (event: string, data?: unknown) => {
    const listeners = c.listeners.get(event);
    if (!listeners) return;
    for (const listener of listeners) listener(data);
  };
  const origEmit = c.emit.bind(c);
  const localOnly = new Set([
    "open",
    "close",
    "error",
    "reconnect_attempt",
    "reconnect_failed",
  ]);
  c.emit = (event: string, data?: unknown, cb?: (r: unknown) => void) => {
    if (localOnly.has(event)) {
      notify(event, data);
      return;
    }
    return origEmit(event, data, cb);
  };
  c.handleMessage = (data: unknown) => {
    if (
      data instanceof ArrayBuffer ||
      data instanceof Blob ||
      data instanceof Uint8Array
    ) {
      notify("binary", data);
      return;
    }
    c.parseMessage(data).then((message) => {
      if (message.type === "pong") {
        c.handlePong();
        return;
      }
      if (message.type === "ping") {
        c.send({ type: "pong" }).catch(() => {});
        return;
      }
      if (message.type === "event" && message.event) {
        notify(message.event, message.data);
        return;
      }
      if (message.type === "callback" && message.callbackId) {
        notify("callback", message.data);
      }
    }).catch((error: unknown) => {
      notify("error", error);
    });
  };
}

const inBrowser = "document" in globalThis;

export function WebChat(props: {
  mode: CsMode;
  apiBase?: string;
  title?: string;
  class?: string;
  /** Shell already shows title (FE Modal / admin CsChatFloat) — skip inner header. */
  hideHeader?: boolean;
  /** Toolbar: emoji/sticker picker. Default false — pass true to show. */
  showEmoji?: boolean;
  /** Toolbar: image pick. Default false. */
  showImage?: boolean;
  /** Toolbar: file/attachment pick. Default false. */
  showAttachment?: boolean;
  /** Toolbar: voice record. Default false. */
  showVoice?: boolean;
  /**
   * Image size cap (bytes). Default 0 = reject until caller sets a limit.
   * Existing product used 5MB — call sites should pass explicitly.
   */
  imageMaxSize?: number;
  /**
   * Attachment MIME allowlist. Default [] = reject all (do not open all files).
   * Caller must pass e.g. application/pdf to widen.
   */
  attachmentAcceptMimes?: string[];
  /**
   * Attachment extension allowlist (with or without leading dot). Default [].
   */
  attachmentAcceptExts?: string[];
  /**
   * Attachment size cap (bytes). Default 0 = reject until caller sets a limit.
   * Existing product used 20MB — call sites should pass explicitly.
   */
  attachmentMaxSize?: number;
  /** Admin RBAC caps (default true for guest / when unset — caller gates). */
  canClaim?: boolean;
  canHide?: boolean;
  canRemove?: boolean;
  canReply?: boolean;
  canUpload?: boolean;
}) {
  const mode = props.mode;
  const isAdmin = mode === "admin";
  const hideHeader = !!props.hideHeader;
  const canClaim = props.canClaim !== false;
  const canHide = props.canHide !== false;
  const canRemove = props.canRemove !== false;
  const canReply = props.canReply !== false;
  const canUpload = props.canUpload !== false;
  const showEmoji = !!props.showEmoji && (!isAdmin || canReply);
  const showImage = !!props.showImage && (!isAdmin || canUpload);
  const showAttachment = !!props.showAttachment && (!isAdmin || canUpload);
  const showVoice = !!props.showVoice && (!isAdmin || canReply);
  const showToolbar = showEmoji || showImage || showAttachment || showVoice;
  const imageMaxSize = props.imageMaxSize ?? 0;
  const attachmentAcceptMimes = (props.attachmentAcceptMimes ?? []).map((m) =>
    String(m || "").toLowerCase().trim()
  ).filter(Boolean);
  const attachmentAcceptExts = (props.attachmentAcceptExts ?? []).map((e) => {
    const s = String(e || "").toLowerCase().trim();
    if (!s) return "";
    return s.startsWith(".") ? s : `.${s}`;
  }).filter(Boolean);
  const attachmentMaxSize = props.attachmentMaxSize ?? 0;
  const guestApi = props.apiBase || apiPublicBase();
  const attachmentAcceptAttr = (() => {
    const parts = [...attachmentAcceptMimes, ...attachmentAcceptExts];
    return parts.length > 0 ? parts.join(",") : undefined;
  })();

  const sessions = createSignal<SessionRow[]>([]);
  const selectedId = createSignal("");
  /** Which session row has swipe actions revealed (mobile / coarse pointer only). */
  const swipeOpenId = createSignal("");
  /** Session id pending ui-view Popconfirm delete ("" = closed). Hide stays confirm-free. */
  const deleteConfirmId = createSignal("");
  /** Admin claim tabs: 我的 / 待认领 (ui-view Tabs). */
  const claimTab = createSignal<ClaimTabKey>("mine");
  /** Current admin id from /api/chat/sessions (filter「我的」). */
  const adminId = createSignal("");

  /**
   * Hard-deleted ids — block WS presence / soft-poll from re-adding ghosts
   * (api process may still emit offline presence after backend delete).
   */
  const deletedSessionIds = new Set<string>();
  /** true → touch / pointer:coarse → swipe; false → desktop ContextMenu (ui-view). */
  const isCoarse = createSignal(false);
  const liveMessages = createSignal<ChatMsg[]>([]);
  const draft = createSignal("");
  const wsState = createSignal<"off" | "connecting" | "on" | "joining" | "err">("off");
  const pendingLocal = createSignal<Set<string> >(new Set());
  const loading = createSignal(false);
  /** Guest contact gate: false until restore/open with phone|email succeeds. */
  const guestReady = createSignal(isAdmin);
  const contactDraft = createSignal("");
  const contactError = createSignal("");
  const statusNote = createSignal("");
  const panel = createSignal<PanelKind>("none");
  const pickerTab = createSignal<PickerTab>("emoji");
  const preview = createSignal<LocalPreview | null>(null);
  const recording = createSignal(false);
  const recordMs = createSignal(0);
  /** ui-view ImageViewer：气泡图点击打开（遮罩／Esc／缩放／多图左右切）。 */
  const viewerOpen = createSignal(false);
  const viewerIndex = createSignal(0);
  /** 每次打开 +1，强制以当前图片快照重挂 ImageViewer（images 非 Signal）。 */
  const viewerEpoch = createSignal(0);
  let viewerImagesSnap: string[] = [];
  const playingId = createSignal("");

  let wsUrl = "";
  let adminWsToken = "";
  let guestToken = "";
  let guestSessionId = "";
  let client: Client | null = null;
  let joinedId = "";
  let joined = false;
  let closed = false;
  type QueuedChat = { kind: CsMessageKind; text: string; media?: CsMediaMeta };
  const queue: QueuedChat[] = [];
  let imageInput: any = null;
  let fileInput: any = null;
  let composerInput: HTMLTextAreaElement | null = null;
  /** IME composition in progress — Enter must not send until confirmed. */
  let composerComposing = false;
  /** Single-line start; grow with content up to ~5 rows (text-sm leading-5 + py-2). */
  const COMPOSER_MAX_H_PX = 5 * 20 + 16;

  function autosizeComposer() {
    const el = composerInput;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, COMPOSER_MAX_H_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > COMPOSER_MAX_H_PX ? "auto" : "hidden";
  }

  function focusComposer() {
    const el = composerInput;
    if (!el) return;
    try {
      el.focus({ preventScroll: true } as FocusOptions);
      const len = el.value?.length ?? 0;
      el.setSelectionRange?.(len, len);
    } catch {
      try {
        el.focus();
      } catch {
        /* ignore */
      }
    }
  }

  /** Prevent toolbar/panel buttons from stealing focus from composer. */
  function keepComposerFocus(e: Event) {
    e.preventDefault();
  }
  let mediaRecorder: any = null;
  let recordChunks: Blob[] = [];
  let recordStartedAt = 0;
  let recordTimer: number | null = null;
  let recordStream: any = null;
  let listEl: any = null;
  /** Pin to bottom until user scrolls up — image onLoad / content RO re-pin. */
  let stickBottom = true;
  let listContentEl: any = null;
  let listContentRo: ResizeObserver | null = null;
  let pollTimer: number | null = null;
  /** Guard overlapping admin list/detail fetches (remount / rapid ensureWs). */
  let adminSessionsInflight = false;
  let adminDetailInflight = "";
  let adminDetailSeq = 0;

  function authToken(): string {
    return isAdmin ? adminWsToken : guestToken;
  }

  function linkLabel() {
    const s = wsState.value;
    if (s === "on") return "已连接";
    if (s === "joining" || s === "connecting") return "连接中…";
    if (s === "err") return "连接异常";
    return "未连接";
  }

  function linkDotClass() {
    const s = wsState.value;
    if (s === "on") return "h-2 w-2 shrink-0 rounded-full bg-emerald-500";
    if (s === "joining" || s === "connecting") {
      return "h-2 w-2 shrink-0 rounded-full bg-amber-400";
    }
    if (s === "err") return "h-2 w-2 shrink-0 rounded-full bg-rose-500";
    return "h-2 w-2 shrink-0 rounded-full bg-slate-400";
  }

  /** Root DOM — used to scope title-status patch (Modal header or inner header). */
  let rootEl: HTMLElement | null = null;
  /** Last patched title-status key — same value skips DOM write. */
  let lastTitleStatusKey = "";

  function findTitleStatusMount(): HTMLElement | null {
    if (!inBrowser) return null;
    const panel = rootEl?.closest?.("[data-ui-modal-panel]") as
      | HTMLElement
      | null
      | undefined;
    const fromModal = panel?.querySelector?.(
      "[data-modal-title-status]",
    ) as HTMLElement | null | undefined;
    if (fromModal) return fromModal;
    const fromSelf = rootEl?.querySelector?.(
      "[data-webchat-title-status]",
    ) as HTMLElement | null | undefined;
    return fromSelf ?? null;
  }

  /**
   * Patch title-side green dot + label via DOM only.
   * Never drives Modal title／header signal（防 Portal／WebChat remount）.
   */
  function patchTitleStatus() {
    if (!inBrowser) return;
    const label = linkLabel();
    const state = wsState.value;
    const key = `${state}|${label}`;
    const mount = findTitleStatusMount();
    if (!mount) return;
    // 同值且挂点仍带状态 → 跳过；挂点若被 Portal 重建为空则重写
    if (
      key === lastTitleStatusKey &&
      mount.getAttribute("data-link-state") === state
    ) {
      return;
    }
    lastTitleStatusKey = key;
    const doc = globalThis.document;
    mount.className =
      "inline-flex shrink-0 items-center gap-1.5 text-xs font-normal text-slate-500 dark:text-slate-400";
    mount.replaceChildren();
    const dot = doc.createElement("span");
    dot.className = linkDotClass();
    dot.setAttribute("aria-hidden", "true");
    const text = doc.createElement("span");
    text.textContent = label;
    mount.append(dot, text);
    mount.setAttribute("data-link-state", state);
    mount.setAttribute("title", label);
  }

  /**
   * Business-only system tip（隐藏失败等）.
   * 连接状态（未连接／连接中／已连接）禁止插入聊天区 — 只走标题旁 DOM patch.
   */
  let lastSystemTip = "";
  const LINK_STATUS_TIPS = new Set(["未连接", "连接中…", "已连接", "连接异常"]);
  function pushSystemTip(text: string) {
    const tip = String(text || "").trim();
    if (!tip) return;
    if (LINK_STATUS_TIPS.has(tip)) return; // 连接状态零插入
    if (tip === lastSystemTip) return;
    const rows = untrack(() => liveMessages.value);
    const last = rows[rows.length - 1];
    if (last?.system && last.text === tip) {
      lastSystemTip = tip;
      return;
    }
    lastSystemTip = tip;
    liveMessages.value = [
      ...rows,
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromName: "",
        fromRole: "system",
        text: tip,
        time: new Date().toISOString(),
        system: true,
      },
    ];
    scrollToBottom();
  }

  /** After history replace — refresh title-status mount only（不插连接系统消息）. */
  function reannounceLinkStatus() {
    if (inBrowser) {
      globalThis.requestAnimationFrame(() => patchTitleStatus());
    }
  }

  function dropWs() {
    closed = true;
    try {
      client?.disconnect();
    } catch {
      // ignore
    }
    client = null;
    joined = false;
    joinedId = "";
    queue.length = 0;
    wsState.value = "off";
  }

  function flush() {
    if (!joined || !joinedId || !client) return;
    while (queue.length) {
      const item = queue.shift()!;
      client.emit("chat", {
        room: roomOf(joinedId),
        kind: item.kind,
        text: item.text,
        media: item.media,
      });
    }
  }

  function doJoin(id: string) {
    if (!client || !id || closed) return;
    if (!client.connected) {
      joinedId = id;
      joined = false;
      wsState.value = "joining";
      return;
    }
    if (joined && joinedId === id) {
      wsState.value = "on";
      flush();
      return;
    }
    if (joined && joinedId && joinedId !== id) {
      client.emit("leave", { room: roomOf(joinedId) });
      joined = false;
    }
    joinedId = id;
    joined = false;
    wsState.value = "joining";
    client.emit("join", { room: roomOf(id) });
  }

  function ensureWs(id: string) {
    if (!wsUrl) {
      wsState.value = "err";
      return;
    }
    if (!client) {
      closed = false;
      wsState.value = "connecting";
      const query: Record<string, string> = isAdmin
        ? { adminToken: adminWsToken }
        : { guestToken };
      if ((isAdmin && !adminWsToken) || (!isAdmin && !guestToken)) {
        wsState.value = "err";
        return;
      }
      client = new Client({
        url: wsUrl,
        query,
        autoReconnect: true,
        maxReconnectAttempts: 0,
        reconnectInterval: 800,
        reconnectStrategy: "exponential",
      });
      patchClientNoInboundEcho(client);

      client.on("open", () => {
        if (closed) return;
        wsState.value = joinedId ? "joining" : "connecting";
      });
      client.on("connected", () => {
        if (closed) return;
        // Admin: explicit lobby join re-fires presence snapshot (server also
        // snapshots on connect). Covers admin refresh while guests stay up —
        // hard HTTP load may still show stale guestOnline=false until snapshot.
        if (isAdmin) {
          client?.emit("join", { room: "cs:lobby" });
        }
        // Guest: always join session room (guestSessionId fallback) so lobby
        // presence fires even if doJoin raced before joinedId was set.
        const joinId = joinedId || (!isAdmin ? guestSessionId : "");
        if (joinId) {
          joinedId = joinId;
          wsState.value = "joining";
          client?.emit("join", { room: roomOf(joinId) });
        } else {
          // Admin with no selected session still receives lobby via server auto-join.
          wsState.value = "on";
        }
      });
      client.on("joined", (data: unknown) => {
        if (closed) return;
        const d = data as { room?: string; sessionId?: string };
        const room = String(d?.room ?? "");
        // Lobby ack is not a session join — never set joinedId to "lobby".
        if (room === "cs:lobby") {
          if (isAdmin && !joinedId) wsState.value = "on";
          return;
        }
        const sid = String(d?.sessionId ?? "").trim() ||
          (room.startsWith("cs:") ? room.slice(3) : "");
        if (joinedId && sid && sid !== joinedId) return;
        joined = true;
        if (sid) joinedId = sid;
        wsState.value = "on";
        flush();
      });
      client.on("chat", (data: unknown) => {
        if (closed) return;
        const d = data as Record<string, unknown> | null;
        if (!d || typeof d !== "object" || !d.id) return;
        const room = String(d.room ?? "");
        if (joinedId && room && room !== roomOf(joinedId)) return;
        const kind = (String(d.kind ?? "text") || "text") as CsMessageKind;
        const next: ChatMsg = {
          id: String(d.id),
          fromName: String(d.fromName ?? ""),
          fromRole: String(d.fromRole ?? ""),
          text: String(d.text ?? ""),
          time: String(d.time ?? ""),
          kind,
          media: d.media as CsMediaMeta | undefined,
          mine: isAdmin
            ? String(d.fromRole ?? "") === "admin"
            : String(d.fromRole ?? "") === "guest",
        };
        const cur = liveMessages.value;
        if (next.id && cur.some((m) => m.id === next.id)) return;
        if (next.mine) {
          const localIdx = cur.findIndex((m) =>
            m.id.startsWith("local-") &&
            pendingLocal.value.has(m.id) &&
            (m.kind ?? "text") === (next.kind ?? "text") &&
            (
              (m.kind ?? "text") === "text" || (m.kind ?? "text") === "emoji"
                ? m.text === next.text
                : true
            )
          );
          if (localIdx >= 0) {
            const localId = cur[localIdx].id;
            const nextSet = new Set(pendingLocal.value);
            nextSet.delete(localId);
            pendingLocal.value = nextSet;
            const copy = cur.slice();
            copy[localIdx] = next;
            liveMessages.value = copy;
            return;
          }
        }
        liveMessages.value = [...cur, next];
        Promise.resolve().then(() => scrollToBottom());
      });
      client.on("session", (data: unknown) => {
        if (closed || !isAdmin) return;
        const d = data as Partial<SessionRow> | null;
        if (!d || typeof d !== "object" || !d.id) return;
        upsertSession({
          id: String(d.id),
          guestName: String(d.guestName ?? ""),
          status: String(d.status ?? "open"),
          lastPreview: String(d.lastPreview ?? ""),
          updatedAt: String(d.updatedAt ?? new Date().toISOString()),
          online: typeof d.online === "boolean" ? d.online : undefined,
          hidden: d.hidden === true ? true : d.hidden === false ? false : undefined,
          claimedByAdminId: d.claimedByAdminId !== undefined
            ? (d.claimedByAdminId ? String(d.claimedByAdminId) : null)
            : undefined,
          claimedByName: d.claimedByName !== undefined
            ? (d.claimedByName ? String(d.claimedByName) : null)
            : undefined,
          claimedAt: d.claimedAt !== undefined
            ? (d.claimedAt ? String(d.claimedAt) : null)
            : undefined,
        });
      });
      client.on("error", () => {
        if (!closed) wsState.value = "err";
      });
      client.on("close", () => {
        if (closed) return;
        joined = false;
        wsState.value = "connecting";
      });
    }
    if (id) doJoin(id);
  }

  function isNearBottom(el: HTMLElement, slack = 80): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= slack;
  }

  function scrollToBottom() {
    stickBottom = true;
    setTimeout(() => {
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    }, 0);
  }

  /** After image height lands (onLoad / RO) — keep bottom if still pinned. */
  function scrollAfterMediaSettle() {
    if (!stickBottom) return;
    const run = () => {
      if (listEl && stickBottom) listEl.scrollTop = listEl.scrollHeight;
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      setTimeout(run, 0);
    }
  }

  function bindListEl(el: any) {
    listEl = el;
    if (!el || typeof el.addEventListener !== "function") return;
    el.addEventListener("scroll", () => {
      stickBottom = isNearBottom(el as HTMLElement);
    }, { passive: true });
  }

  function bindListContent(el: any) {
    if (listContentRo) {
      try {
        listContentRo.disconnect();
      } catch {
        /* ignore */
      }
      listContentRo = null;
    }
    listContentEl = el;
    if (!el || typeof ResizeObserver === "undefined") return;
    listContentRo = new ResizeObserver(() => {
      if (stickBottom && listEl) listEl.scrollTop = listEl.scrollHeight;
    });
    listContentRo.observe(el);
  }

  function onChatImageSettle(img?: HTMLImageElement | null) {
    if (img && img.complete && img.naturalHeight > 0) {
      scrollAfterMediaSettle();
    }
  }

  /**
   * Online-first (all green before all gray), then updatedAt desc.
   * Same contact → one row (server also dedupes; client guards WS/soft races).
   */
  function sortSessions(rows: SessionRow[]): SessionRow[] {
    return dedupeCsLobbyRowsByContact(rows);
  }

  /** Upsert one lobby/presence row; preserve name/online when patch is partial. */
  function upsertSession(row: SessionRow) {
    if (!row?.id) return;
    // Local hard-delete tombstone wins over stale presence frames.
    if (deletedSessionIds.has(row.id)) {
      row = { ...row, hidden: true };
    }
    const cur = sessions.value;
    const idx = cur.findIndex((s) => s.id === row.id);
    // Hide / delete lobby signal → drop from list — unless guest is online
    // (online always stays visible / claimable; hiddenAt re-applies when offline).
    if (row.hidden === true && row.online !== true) {
      if (idx < 0) return;
      const copy = cur.slice();
      copy.splice(idx, 1);
      sessions.value = copy;
      if (selectedId.value === row.id) {
        selectedId.value = "";
        liveMessages.value = [];
      }
      if (swipeOpenId.value === row.id) swipeOpenId.value = "";
      return;
    }
    if (row.hidden === true && row.online === true) {
      row = { ...row, hidden: false };
    }
    // Claimed by another admin → not in 我的／待认领; drop local row.
    const me = adminId.value.trim();
    const claimedBy = row.claimedByAdminId != null
      ? String(row.claimedByAdminId).trim()
      : "";
    if (claimedBy && me && claimedBy !== me) {
      if (idx >= 0) {
        const copy = cur.slice();
        copy.splice(idx, 1);
        sessions.value = copy;
      }
      if (selectedId.value === row.id) {
        selectedId.value = "";
        liveMessages.value = [];
      }
      return;
    }
    if (idx < 0) {
      // Don't insert others' claims into local list.
      if (claimedBy && me && claimedBy !== me) return;
      if (claimedBy && !me) {
        // adminId not yet known — still keep unclaimed only for safety on first paint
        // (claimed rows wait until adminId arrives via sessions bootstrap).
      }
      sessions.value = sortSessions([...cur, row]);
      return;
    }
    const prev = cur[idx];
    const next: SessionRow = {
      ...prev,
      ...row,
      guestName: (row.guestName && row.guestName.trim()) || prev.guestName,
      lastPreview: row.lastPreview != null && row.lastPreview !== ""
        ? row.lastPreview
        : (prev.lastPreview ?? ""),
      online: row.online !== undefined ? row.online : prev.online,
      updatedAt: row.updatedAt || prev.updatedAt,
      hidden: false,
      // Never clear a known claim via partial lobby frames (presence phase-1).
      claimedByAdminId: (() => {
        const incoming = row.claimedByAdminId !== undefined
          ? row.claimedByAdminId
          : undefined;
        const prevClaim = prev.claimedByAdminId;
        if (incoming === undefined) return prevClaim;
        const next = incoming != null && String(incoming).trim()
          ? String(incoming).trim()
          : null;
        if (!next && prevClaim && String(prevClaim).trim()) return prevClaim;
        return next;
      })(),
      claimedByName: (() => {
        if (row.claimedByName === undefined) return prev.claimedByName;
        const keepClaim = (prev.claimedByAdminId &&
          String(prev.claimedByAdminId).trim()) &&
          !(row.claimedByAdminId != null && String(row.claimedByAdminId).trim());
        if (keepClaim) return prev.claimedByName;
        return row.claimedByName;
      })(),
      claimedAt: (() => {
        if (row.claimedAt === undefined) return prev.claimedAt;
        const keepClaim = (prev.claimedByAdminId &&
          String(prev.claimedByAdminId).trim()) &&
          !(row.claimedByAdminId != null && String(row.claimedByAdminId).trim());
        if (keepClaim) return prev.claimedAt;
        return row.claimedAt;
      })(),
    };
    const copy = cur.slice();
    copy[idx] = next;
    sessions.value = sortSessions(copy);
  }

  function removeSessionLocal(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id);
    if (selectedId.value === id) {
      selectedId.value = "";
      liveMessages.value = [];
    }
    if (swipeOpenId.value === id) swipeOpenId.value = "";
    if (deleteConfirmId.value === id) deleteConfirmId.value = "";
  }

  function isUnclaimed(row: SessionRow): boolean {
    return !row.claimedByAdminId || !String(row.claimedByAdminId).trim();
  }

  function isMine(row: SessionRow): boolean {
    const me = adminId.value.trim();
    if (!me || isUnclaimed(row)) return false;
    return String(row.claimedByAdminId) === me;
  }

  /** Rows for current claim tab (others' claims hidden from both tabs). */
  function sessionsForClaimTab(): SessionRow[] {
    const tab = claimTab.value;
    const rows = sessions.value;
    if (tab === "pending") return rows.filter((r) => isUnclaimed(r));
    return rows.filter((r) => isMine(r));
  }

  function pendingClaimCount(): number {
    return sessions.value.filter((r) => isUnclaimed(r)).length;
  }

  /**
   * Claim action (MVP): row「认领」button → POST /api/chat/claim.
   * On success: switch to「我的」and open the session.
   */
  async function claimSession(id: string) {
    if (!canClaim) {
      toast.error("无权限");
      statusNote.value = "无权限";
      return;
    }
    const snapshot = sessions.value.slice();
    try {
      // api() returns ApiResult { ok, status, data } — NOT fetch Response.
      const res = await api<{
        session?: SessionRow;
        already?: boolean;
        message?: string;
        error?: string;
      }>("POST", "/api/chat/claim", { sessionId: id });
      if (!res.ok) {
        const errCode = String(res.data.error || "");
        const rawMsg = String(res.data.message || "").trim();
        if (res.status === 409 || errCode === "conflict") {
          // Prefer「已被 xxx 认领」; API may say「已由 xxx 认领」.
          let tip = "已被认领";
          const who =
            rawMsg.match(/已[由被]\s*(.+?)\s*认领/)?.[1]?.trim() ||
            "";
          if (who && who !== "其他客服") tip = `已被 ${who} 认领`;
          else if (who) tip = `已被 ${who} 认领`;
          toast.warning(tip);
          statusNote.value = tip;
          void loadAdminSessions({ soft: true });
          return;
        }
        const fail = rawMsg || errCode || "认领失败";
        toast.error(fail);
        statusNote.value = fail;
        return;
      }
      if (res.data.session) {
        upsertSession({ ...res.data.session, hidden: false });
      } else {
        // Fallback: mark mine locally if body thin.
        const me = adminId.value.trim();
        upsertSession({
          id,
          guestName: "",
          status: "open",
          lastPreview: "",
          updatedAt: new Date().toISOString(),
          claimedByAdminId: me || "self",
          claimedByName: me ? undefined : null,
          claimedAt: new Date().toISOString(),
          hidden: false,
        });
      }
      // Stay on「待认领」for continuous claim; only flip to「我的」when none left.
      if (pendingClaimCount() === 0) {
        claimTab.value = "mine";
      }
      selectedId.value = id;
      void loadAdminDetail(id);
      statusNote.value = "";
    } catch (e) {
      console.error("[cs-chat] claim", e);
      sessions.value = sortSessions(snapshot);
      toast.error("认领失败");
      statusNote.value = "认领失败";
    }
  }

  async function hideSession(id: string) {
    if (!canHide) {
      toast.error("无权限");
      statusNote.value = "无权限";
      return;
    }
    swipeOpenId.value = "";
    const snapshot = sessions.value.slice();
    // Optimistic drop so ContextMenu / swipe feel instant.
    removeSessionLocal(id);
    try {
      const res = await api("POST", "/api/chat/hide", { sessionId: id });
      if (!res.ok) {
        sessions.value = sortSessions(snapshot);
        statusNote.value = "隐藏失败";
        return;
      }
      statusNote.value = "";
    } catch (e) {
      console.error("[cs-chat] hide", e);
      sessions.value = sortSessions(snapshot);
      statusNote.value = "隐藏失败";
    }
  }

  /** After ui-view Popconfirm OK — CSRF api remove + optimistic drop. No native dialog. */
  async function deleteSession(id: string) {
    if (!canRemove) {
      toast.error("无权限");
      statusNote.value = "无权限";
      return;
    }
    deleteConfirmId.value = "";
    swipeOpenId.value = "";
    const snapshot = sessions.value.slice();
    deletedSessionIds.add(id);
    removeSessionLocal(id);
    try {
      const res = await api("POST", "/api/chat/remove", { sessionId: id });
      if (!res.ok) {
        deletedSessionIds.delete(id);
        sessions.value = sortSessions(snapshot);
        statusNote.value = "删除失败";
        return;
      }
      statusNote.value = "";
    } catch (e) {
      console.error("[cs-chat] delete", e);
      deletedSessionIds.delete(id);
      sessions.value = sortSessions(snapshot);
      statusNote.value = "删除失败";
    }
  }

  function openDeleteConfirm(id: string) {
    deleteConfirmId.value = id;
  }

  /**
   * ContextMenu item click shares the document click that closed the menu.
   * Defer Popconfirm open past that click + ui-view double-rAF arm window
   * so the panel is not immediately requestClose'd.
   */
  function openDeleteConfirmDeferred(id: string) {
    globalThis.setTimeout?.(() => openDeleteConfirm(id), 10);
  }

  function mergeSessionList(
    incoming: SessionRow[],
    opts?: { soft?: boolean },
  ) {
    const soft = !!opts?.soft;
    const prevRows = sessions.value;
    const prevMap = new Map(prevRows.map((s) => [s.id, s]));
    const wsLive = wsState.value === "on" || wsState.value === "joining";
    // Soft poll OR live WS: never demote a green already shown (Mongo lag /
    // missed /cs/online). Hard first paint trusts HTTP (backend merges live ids).
    const keepGreen = soft || wsLive;
    const me = adminId.value.trim();
    const merged = incoming
      .filter((s) => !deletedSessionIds.has(s.id))
      .filter((s) => {
        if (!me) return true;
        const by = s.claimedByAdminId != null
          ? String(s.claimedByAdminId).trim()
          : "";
        // Keep unclaimed + mine only (others' claims never enter local list).
        return !by || by === me;
      })
      .map((s) => {
        const prev = prevMap.get(s.id);
        if (!prev) return s;
        const online = s.online === true ||
          (keepGreen && prev.online === true) ||
          (!keepGreen && s.online === undefined && prev.online === true)
          ? true
          : (s.online !== undefined ? s.online : prev.online);
        return {
          ...s,
          online,
          guestName: (s.guestName && s.guestName.trim()) || prev.guestName,
        };
      });
    // Soft-poll can omit rows (stale hide / guestOnline race). Keep local rows
    // the lobby already shows — online OR short-offline — so disconnect does not
    // wipe the line (avatar goes grayscale via online=false; 24h hide still server-side).
    // Hard load may replace; tombstones still block re-add.
    const seen = new Set(merged.map((s) => s.id));
    for (const prev of prevRows) {
      if (deletedSessionIds.has(prev.id) || seen.has(prev.id)) continue;
      if (soft || prev.online) {
        merged.push({ ...prev, hidden: false });
        seen.add(prev.id);
      }
    }
    sessions.value = sortSessions(merged);
  }

  async function loadAdminSessions(opts?: { soft?: boolean }) {
    const soft = !!opts?.soft;
    if (adminSessionsInflight) return;
    adminSessionsInflight = true;
    if (!soft) loading.value = true;
    try {
      const res = await fetch("/api/chat/sessions", { credentials: "same-origin" });
      if (!res.ok) {
        if (!soft) {
          wsState.value = "err";
          statusNote.value = "加载会话失败";
        }
        return;
      }
      const data = await res.json() as {
        sessions?: SessionRow[];
        wsUrl?: string;
        adminWsToken?: string;
        adminId?: string;
      };
      // adminId first — claim visibility filter needs it during merge.
      if (data.adminId) adminId.value = String(data.adminId);
      mergeSessionList(data.sessions ?? [], { soft });
      if (data.wsUrl) wsUrl = data.wsUrl;
      if (data.adminWsToken) adminWsToken = data.adminWsToken;
      if (wsUrl && adminWsToken) ensureWs(selectedId.value);
      else if (!soft) wsState.value = "err";
    } catch (e) {
      console.error("[cs-chat] load sessions", e);
      if (!soft) wsState.value = "err";
    } finally {
      adminSessionsInflight = false;
      if (!soft) loading.value = false;
    }
  }

  async function loadAdminDetail(id: string) {
    if (!id) {
      liveMessages.value = [];
      return;
    }
    // Same session already fetching → skip; newer selection bumps seq.
    if (adminDetailInflight === id) return;
    const seq = ++adminDetailSeq;
    adminDetailInflight = id;
    try {
      const res = await fetch(
        `/api/chat/detail?sessionId=${encodeURIComponent(id)}`,
        { credentials: "same-origin" },
      );
      if (seq !== adminDetailSeq) return;
      if (!res.ok) return;
      const data = await res.json() as { messages?: ChatMsg[] };
      if (seq !== adminDetailSeq) return;
      liveMessages.value = (data.messages ?? []).map((m) => ({
        ...m,
        kind: m.kind ?? "text",
        mine: m.fromRole === "admin",
      }));
      pendingLocal.value = new Set();
      ensureWs(id);
      reannounceLinkStatus();
      scrollToBottom();
    } catch (e) {
      console.error("[cs-chat] load detail", e);
    } finally {
      if (adminDetailInflight === id) adminDetailInflight = "";
    }
  }

  const GUEST_LS_KEY = "dweb_admin_cs_guest";

  function persistGuestLocal(opts: {
    sessionId: string;
    guestToken: string;
    wsUrl?: string;
    guestName?: string;
  }) {
    try {
      localStorage.setItem(
        GUEST_LS_KEY,
        JSON.stringify({
          sessionId: opts.sessionId,
          guestToken: opts.guestToken,
          wsUrl: opts.wsUrl || undefined,
          guestName: opts.guestName || undefined,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  /** Resolve WS + ensureWs after session/token are set. */
  async function finishGuestConnect() {
    wsUrl = resolveGuestWsUrl({ openWsUrl: wsUrl, apiBase: guestApi });
    if (wsUrl) {
      try {
        const cur = JSON.parse(localStorage.getItem(GUEST_LS_KEY) || "null") as {
          sessionId?: string;
          guestToken?: string;
          wsUrl?: string;
          guestName?: string;
        } | null;
        if (cur?.sessionId && cur?.guestToken && cur.wsUrl !== wsUrl) {
          persistGuestLocal({
            sessionId: cur.sessionId,
            guestToken: cur.guestToken,
            wsUrl,
            guestName: cur.guestName,
          });
        }
      } catch {
        /* ignore */
      }
    }
    if (!wsUrl) {
      wsState.value = "err";
      statusNote.value = "无有效客服通道地址";
      return false;
    }
    ensureWs(guestSessionId);
    scrollToBottom();
    return true;
  }

  /**
   * Try restore saved guest session. Returns true when chat is ready.
   * Does NOT create a new session (contact gate required for new opens).
   */
  async function tryRestoreGuest(): Promise<boolean> {
    loading.value = true;
    contactError.value = "";
    try {
      let saved: {
        sessionId: string;
        guestToken: string;
        wsUrl?: string;
        guestName?: string;
      } | null = null;
      try {
        saved = JSON.parse(localStorage.getItem(GUEST_LS_KEY) || "null");
      } catch {
        saved = null;
      }
      if (!saved?.sessionId || !saved?.guestToken) return false;
      guestSessionId = saved.sessionId;
      guestToken = saved.guestToken;
      if (saved.wsUrl) wsUrl = saved.wsUrl;
      const res = await fetch(
        `${guestApi}/cs/detail?sessionId=${encodeURIComponent(guestSessionId)}&guestToken=${encodeURIComponent(guestToken)}`,
      );
      if (!res.ok) return false;
      const data = await res.json() as {
        session?: SessionRow | null;
        messages?: ChatMsg[];
        wsUrl?: string;
      };
      if (!data.session) return false;
      // Legacy「访客」/ missing contact → force contact gate (do not enter chat).
      const restoredName = String(
        saved.guestName || data.session.guestName || "",
      ).trim();
      if (!isValidGuestContact(restoredName)) {
        try {
          localStorage.removeItem(GUEST_LS_KEY);
        } catch {
          /* ignore */
        }
        guestSessionId = "";
        guestToken = "";
        return false;
      }
      if (data.wsUrl) wsUrl = data.wsUrl;
      selectedId.value = guestSessionId;
      liveMessages.value = (data.messages ?? []).map((m) => ({
        ...m,
        kind: m.kind ?? "text",
        mine: m.fromRole === "guest",
      }));
      reannounceLinkStatus();
      const ok = await finishGuestConnect();
      if (ok) guestReady.value = true;
      return ok;
    } catch (e) {
      console.error("[cs-chat] guest restore", e);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /** Contact gate submit → open session with phone|email as guestName. */
  async function openGuestWithContact(rawContact: string) {
    const contact = normalizeGuestContact(rawContact);
    contactError.value = "";
    if (!isValidGuestContact(contact)) {
      contactError.value = "请填写有效的手机号或邮箱";
      return;
    }
    loading.value = true;
    try {
      const res = await fetch(`${guestApi}/cs/open`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guestName: contact }),
      });
      if (!res.ok) {
        let msg = "无法创建会话";
        try {
          const err = await res.json() as { message?: string };
          if (err.message) msg = err.message;
        } catch {
          /* ignore */
        }
        contactError.value = msg;
        wsState.value = "err";
        return;
      }
      const data = await res.json() as {
        sessionId: string;
        guestToken: string;
        guestName?: string;
        wsUrl?: string;
      };
      guestSessionId = data.sessionId;
      guestToken = data.guestToken;
      if (data.wsUrl) wsUrl = data.wsUrl;
      persistGuestLocal({
        sessionId: guestSessionId,
        guestToken,
        wsUrl: wsUrl || undefined,
        guestName: data.guestName || contact,
      });
      selectedId.value = guestSessionId;
      liveMessages.value = [];
      reannounceLinkStatus();
      const ok = await finishGuestConnect();
      if (ok) {
        guestReady.value = true;
        contactDraft.value = "";
      }
    } catch (e) {
      console.error("[cs-chat] guest open", e);
      contactError.value = "网络异常，请重试";
      wsState.value = "err";
    } finally {
      loading.value = false;
    }
  }

  function submitContactGate(e?: Event) {
    e?.preventDefault?.();
    void openGuestWithContact(contactDraft.value);
  }

  function selectSession(id: string) {

    if (selectedId.value === id) return;
    selectedId.value = id;
    void loadAdminDetail(id);
  }

  function emitChat(kind: CsMessageKind, text: string, media?: CsMediaMeta) {
    const payload = { kind, text, media };
    if (joined && client?.connected) {
      client.emit("chat", {
        room: roomOf(selectedId.value),
        ...payload,
      });
    } else if (client?.connected) {
      queue.push(payload);
      doJoin(selectedId.value);
    } else {
      wsState.value = "err";
    }
  }

  function pushLocal(
    kind: CsMessageKind,
    text: string,
    media?: CsMediaMeta,
    extra?: Pick<ChatMsg, "uploadStatus" | "uploadError">,
  ): string {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextSet = new Set(pendingLocal.value);
    nextSet.add(localId);
    pendingLocal.value = nextSet;
    const nowIso = new Date().toISOString();
    liveMessages.value = [
      ...liveMessages.value,
      {
        id: localId,
        fromName: isAdmin ? "在线客服" : "我",
        fromRole: isAdmin ? "admin" : "guest",
        text,
        time: nowIso,
        mine: true,
        kind,
        media,
        uploadStatus: extra?.uploadStatus,
        uploadError: extra?.uploadError,
      },
    ];
    // New message → float session to top of its online/offline band.
    if (isAdmin && selectedId.value) {
      const sid = selectedId.value;
      const rows = sessions.value;
      const idx = rows.findIndex((s) => s.id === sid);
      if (idx >= 0) {
        const copy = rows.slice();
        const prev = copy[idx]!;
        copy[idx] = {
          ...prev,
          updatedAt: nowIso,
          lastPreview: text || prev.lastPreview || "",
        };
        sessions.value = sortSessions(copy);
      }
    }
    scrollToBottom();
    return localId;
  }

  function patchLocalMessage(localId: string, patch: Partial<ChatMsg>) {
    const cur = liveMessages.value;
    const idx = cur.findIndex((m) => m.id === localId);
    if (idx < 0) return;
    const copy = cur.slice();
    copy[idx] = { ...copy[idx]!, ...patch };
    liveMessages.value = copy;
  }

  function sendText() {
    if (!selectedId.value) return;
    if (isAdmin && !canReply) {
      toast.error("无权限");
      statusNote.value = "无权限";
      return;
    }
    // Pending paste/pick preview → confirm send (image/file/voice + optional draft text).
    // Never silent-send on paste; preview must be confirmed via 发送 / Enter.
    // Image upload runs in bubble — do NOT block composer on global uploading.
    if (preview.value) {
      void confirmPreview();
      return;
    }
    const text = draft.value.trim();
    if (!text) return;
    pushLocal("text", text);
    draft.value = "";
    panel.value = "none";
    emitChat("text", text);
    requestAnimationFrame(autosizeComposer);
  }

  function insertEmoji(emoji: string) {
    draft.value = `${draft.value}${emoji}`;
    focusComposer();
    requestAnimationFrame(autosizeComposer);
  }

  function sendSticker(id: string) {
    if (!selectedId.value) return;
    if (isAdmin && !canReply) {
      toast.error("无权限");
      statusNote.value = "无权限";
      return;
    }
    const s = stickerById(id);
    if (!s) return;
    const media: CsMediaMeta = {
      url: `sticker:${s.id}`,
      mime: "image/sticker",
      name: s.id,
    };
    pushLocal("sticker", s.emoji, media);
    panel.value = "none";
    emitChat("sticker", s.emoji, media);
    focusComposer();
  }

  function clearPreview() {
    const p = preview.value;
    if (p?.blobUrl) {
      try {
        URL.revokeObjectURL(p.blobUrl);
      } catch {
        // ignore
      }
    }
    preview.value = null;
    requestAnimationFrame(() => {
      focusComposer();
      autosizeComposer();
    });
  }

  function pickImage(file: File) {
    if (!showImage) {
      statusNote.value = "未开启图片发送";
      return;
    }
    if (!file.type.startsWith("image/")) {
      statusNote.value = "请选择图片";
      return;
    }
    if (imageMaxSize <= 0) {
      statusNote.value = "未配置图片大小上限";
      return;
    }
    if (file.size > imageMaxSize) {
      statusNote.value = `图片请小于 ${humanSizeCap(imageMaxSize)}`;
      return;
    }
    clearPreview();
    preview.value = {
      kind: "image",
      file,
      blobUrl: URL.createObjectURL(file),
      name: file.name,
      mime: file.type || "image/jpeg",
      size: file.size,
    };
    panel.value = "none";
    // Cursor sits on the same row after the thumb (inline composer).
    requestAnimationFrame(() => focusComposer());
  }

  function attachmentAllowed(file: File): string | null {
    if (!showAttachment) return "未开启附件发送";
    if (attachmentMaxSize <= 0) return "未配置附件大小上限";
    if (attachmentAcceptMimes.length === 0 && attachmentAcceptExts.length === 0) {
      return "未配置允许的附件类型";
    }
    if (file.size > attachmentMaxSize) {
      return `文件请小于 ${humanSizeCap(attachmentMaxSize)}`;
    }
    const mime = String(file.type || "").toLowerCase().trim();
    const ext = fileExtName(file.name);
    const mimeOk = attachmentAcceptMimes.length === 0
      ? true
      : !!mime && attachmentAcceptMimes.some((m) =>
        mime === m || (m.endsWith("/*") && mime.startsWith(m.slice(0, -1)))
      );
    const extOk = attachmentAcceptExts.length === 0
      ? true
      : !!ext && attachmentAcceptExts.includes(ext);
    // Both lists configured → OR (either mime or ext match). One list → that list must match.
    if (attachmentAcceptMimes.length > 0 && attachmentAcceptExts.length > 0) {
      if (!mimeOk && !extOk) return "不支持的文件类型";
    } else if (attachmentAcceptMimes.length > 0) {
      if (!mimeOk) return "不支持的文件类型";
    } else if (!extOk) {
      return "不支持的文件类型";
    }
    return null;
  }

  function pickFile(file: File) {
    const err = attachmentAllowed(file);
    if (err) {
      statusNote.value = err;
      toast.warning(err);
      return;
    }
    clearPreview();
    preview.value = {
      kind: "file",
      file,
      blobUrl: URL.createObjectURL(file),
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
    };
    panel.value = "none";
    requestAnimationFrame(() => focusComposer());
  }


  /**
   * Upload HTTP base: admin SSR/browser often has empty apiPublicBase —
   * derive from wsUrl (ws://host:port/ws → http://host:port). Guest same-origin keeps "".
   */
  function uploadHttpBase(): string {
    const configured = guestApi.replace(/\/$/, "");
    if (configured) return configured;
    const ws = String(wsUrl || "").trim();
    if (/^wss?:\/\//i.test(ws)) {
      return ws
        .replace(/^ws/i, "http")
        .replace(/\/ws\/?([?#].*)?$/i, "");
    }
    return "";
  }

  async function uploadAndSend(p: LocalPreview, captionText = "") {
    if (!selectedId.value || !p.file) return;
    const token = authToken();
    if (!token) {
      statusNote.value = "未鉴权，无法上传";
      return;
    }
    const kind: CsMessageKind =
      p.kind === "image" ? "image" : p.kind === "voice" ? "voice" : "file";
    const caption = kind === "file" ? (captionText || p.name) : captionText;
    const declared = uploadMimeFor(p.mime);
    const blobUrl = p.blobUrl;
    const file = p.file;
    const name = p.name;
    const size = p.size;
    const durationMs = p.durationMs;
    const sessionId = selectedId.value;

    // Optimistic UX: bubble first with「正在上传」mask; clear composer immediately.
    // Do NOT occupy composer with progress / 上传中 — user can keep typing.
    preview.value = null;
    draft.value = "";
    panel.value = "none";
    statusNote.value = "";
    requestAnimationFrame(() => {
      focusComposer();
      autosizeComposer();
    });

    const localMedia: CsMediaMeta = {
      url: blobUrl || "",
      mime: declared,
      name,
      size,
      durationMs,
      thumbUrl: kind === "image" ? blobUrl : undefined,
    };
    const localId = pushLocal(kind, caption, localMedia, {
      uploadStatus: "uploading",
    });

    try {
      const endpoint = `${uploadHttpBase()}/ui-view-upload`;
      const up = new WebchatUploadClient({
        endpoint,
        token,
        chunkSize: 1024 * 1024,
        concurrency: 2,
      });
      const result = await up.upload(file, {
        filename: name,
        mimeType: declared,
        path: sessionId,
      });
      if (!result.success || !result.url) {
        const msg = friendlyUploadError(result.error || "上传失败");
        patchLocalMessage(localId, {
          uploadStatus: "failed",
          uploadError: msg,
        });
        statusNote.value = msg;
        return;
      }
      const media: CsMediaMeta = {
        url: result.url,
        mime: declared,
        name,
        size,
        durationMs,
        thumbUrl: kind === "image"
          ? (result.thumbUrl || result.url)
          : undefined,
      };
      // Keep blob in bubble until WS echo replaces the local- id.
      emitChat(kind, caption, media);
      // If echo is slow, drop uploading mask so success isn't stuck.
      patchLocalMessage(localId, {
        uploadStatus: undefined,
        uploadError: undefined,
        media: {
          ...media,
          // Prefer blob for instant paint until echo swaps the whole msg.
          url: kind === "image" || kind === "voice" ? blobUrl : media.url,
          thumbUrl: kind === "image" ? blobUrl : media.thumbUrl,
        },
      });
    } catch (e) {
      console.error("[webchat] upload", e);
      const msg = friendlyUploadError(e);
      patchLocalMessage(localId, {
        uploadStatus: "failed",
        uploadError: msg,
      });
      statusNote.value = msg;
    }
  }

  async function confirmPreview() {
    const p = preview.value;
    if (!p || !selectedId.value) return;
    const captionText = draft.value.trim();
    await uploadAndSend(p, captionText);
  }

  async function startRecord() {
    if (recording.value || !inBrowser) return;
    try {
      recordStream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
      const mime = (globalThis as any).MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : (globalThis as any).MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      mediaRecorder = mime
        ? new (globalThis as any).MediaRecorder(recordStream, { mimeType: mime })
        : new (globalThis as any).MediaRecorder(recordStream);
      recordChunks = [];
      mediaRecorder.ondataavailable = (ev: any) => {
        if (ev.data && ev.data.size > 0) recordChunks.push(ev.data);
      };
      mediaRecorder.onstop = () => {
        const durationMs = Date.now() - recordStartedAt;
        if (recordTimer != null) {
          clearInterval(recordTimer);
          recordTimer = null;
        }
        recordStream?.getTracks().forEach((t: any) => t.stop());
        recordStream = null;
        recording.value = false;
        const blob = new Blob(recordChunks, {
          type: mediaRecorder?.mimeType || "audio/webm",
        });
        if (blob.size < 200 || durationMs < 400) {
          statusNote.value = "录音太短";
          return;
        }
        if (blob.size > 2 * 1024 * 1024 || durationMs > 60_000) {
          statusNote.value = "语音请 ≤60s / 2MB";
          return;
        }
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, {
          type: blob.type || "audio/webm",
        });
        clearPreview();
        preview.value = {
          kind: "voice",
          file,
          blobUrl: URL.createObjectURL(blob),
          name: file.name,
          mime: file.type,
          size: file.size,
          durationMs,
        };
      };
      recordStartedAt = Date.now();
      recordMs.value = 0;
      recording.value = true;
      panel.value = "none";
      mediaRecorder.start(200);
      recordTimer = setInterval(() => {
        recordMs.value = Date.now() - recordStartedAt;
        if (recordMs.value >= 60_000) stopRecord();
      }, 200) as unknown as number;
    } catch (e) {
      console.error("[webchat] mic", e);
      statusNote.value = "无法使用麦克风";
      recording.value = false;
    }
  }

  function stopRecord() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      recording.value = false;
      return;
    }
    try {
      mediaRecorder.stop();
    } catch {
      recording.value = false;
    }
  }

  function cancelRecord() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = () => {
        recordStream?.getTracks().forEach((t: any) => t.stop());
        recordStream = null;
      };
      try {
        mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    if (recordTimer != null) {
      clearInterval(recordTimer);
      recordTimer = null;
    }
    recordStream?.getTracks().forEach((t: any) => t.stop());
    recordStream = null;
    recording.value = false;
    recordMs.value = 0;
  }

  onMount(() => {
    if (!inBrowser) return;
    if (isAdmin) {
      void loadAdminSessions().then(() => {
        const first = selectedId.value || sessions.value[0]?.id;
        if (first) {
          selectedId.value = first;
          void loadAdminDetail(first);
        }
        // Early soft re-pull after WS lobby snapshot window (hard refresh green).
        globalThis.setTimeout?.(() => {
          if (!closed) void loadAdminSessions({ soft: true });
        }, 1500);
      });
      // Soft poll — covers open-before-WS and missed lobby frames.
      pollTimer = setInterval(() => {
        if (closed) return;
        void loadAdminSessions({ soft: true });
      }, 8000) as unknown as number;
      // Detect mobile / coarse pointer once (swipe vs right-click).
      try {
        // Desktop (pointer:fine) → right-click menu; phone/tablet (pointer:coarse) → swipe.
        isCoarse.value = !!globalThis.matchMedia?.("(pointer: coarse)")?.matches;
      } catch {
        isCoarse.value = false;
      }
      // Outside tap → close swipe (ContextMenu closes itself via ui-view).
      const onDocPointer = (ev: Event) => {
        const t = ev.target as Element | null;
        if (!swipeOpenId.value) return;
        if (t && typeof t.closest === "function" && t.closest('[data-testid="cs-session-row"]')) {
          return;
        }
        swipeOpenId.value = "";
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          swipeOpenId.value = "";
        }
      };
      document.addEventListener("pointerdown", onDocPointer, true);
      document.addEventListener("keydown", onKey, true);
      onCleanup(() => {
        document.removeEventListener("pointerdown", onDocPointer, true);
        document.removeEventListener("keydown", onKey, true);
      });
    } else {
      void tryRestoreGuest().then((ok) => {
        if (!ok) guestReady.value = false;
      });
    }
    onCleanup(() => {
      if (pollTimer != null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (listContentRo) {
        try {
          listContentRo.disconnect();
        } catch {
          /* ignore */
        }
        listContentRo = null;
      }
      dropWs();
      cancelRecord();
      clearPreview();
    });
  });

  createEffect(() => {
    void selectedId.value;
  });

  // guest＋admin：连接状态只 DOM patch 标题挂点；聊天区零插入连接系统消息（勿上抛 Modal title／signal）
  createEffect(() => {
    void wsState.value;
    if (inBrowser) {
      globalThis.requestAnimationFrame(() => patchTitleStatus());
    }
  });
  createEffect(() => {
    const note = statusNote.value;
    // 业务提示可居中；连接状态文案被 pushSystemTip 黑名单拦掉
    if (note) pushSystemTip(note);
  });

  const rootClass = [
    "flex h-full max-h-full min-h-0 flex-col gap-0 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
    props.class || "",
  ].filter(Boolean).join(" ");

  /** 收集当前会话图片 URL，打开 ui-view ImageViewer（点哪张从哪张起）。 */
  function collectChatImageSrcs(): string[] {
    const token = authToken();
    const out: string[] = [];
    for (const m of liveMessages.value) {
      if (m.system || m.fromRole === "system") continue;
      if ((m.kind ?? "text") !== "image") continue;
      // Viewer list prefers orig url; fall back to thumb only if url missing.
      const key = m.media?.url || m.media?.thumbUrl;
      if (!key) continue;
      const src = mediaAbsUrl(uploadHttpBase() || guestApi, key, token, isAdmin);
      if (src) out.push(src);
    }
    return out;
  }

  function openImageViewer(src: string) {
    if (!src) return;
    const list = collectChatImageSrcs();
    if (list.length === 0) {
      viewerImagesSnap = [src];
      viewerIndex.value = 0;
    } else {
      viewerImagesSnap = list.slice();
      const idx = list.indexOf(src);
      viewerIndex.value = idx >= 0 ? idx : 0;
    }
    viewerEpoch.value += 1;
    viewerOpen.value = true;
  }

  function renderBubble(m: ChatMsg) {
    // 业务系统提示可居中；连接状态（未连接／连接中／已连接）零渲染（标题旁 DOM patch 已承担）.
    if (m.system || m.fromRole === "system") {
      const tip = String(m.text || "").trim();
      if (LINK_STATUS_TIPS.has(tip)) return null;
      return (
        <div class="flex justify-center py-1" data-testid="web-chat-system-msg">
          <span class="max-w-[90%] rounded-full bg-black/5 px-3 py-1 text-center text-[11px] leading-relaxed text-slate-500 dark:bg-white/10 dark:text-slate-400">
            {m.text}
          </span>
        </div>
      );
    }

    const kind = m.kind ?? "text";
    const mine = !!m.mine;
    const token = authToken();
    // Admin page (8810) has no /ui-view-upload proxy — must use API base from wsUrl
    // (same as uploadHttpBase). Guest same-origin keeps "" and uses FE/mobile proxy.
    const mediaBase = uploadHttpBase() || guestApi;
    const abs = m.media?.url
      ? mediaAbsUrl(mediaBase, m.media.url, token, isAdmin)
      : "";

    // Shared with text + image bubbles — keep padding／border／meta identical.
    // flex+gap-1：meta→内容间距与文字气泡同一 token（原 bubbleMeta mb-1 = 0.25rem）；
    // 勿靠图包 leading-none／负 margin 吃掉 gap。图身再用 1lh 半行高垫齐文字 glyph 顶距。
    const bubbleShell =
      `flex max-w-[82%] flex-col gap-1 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
        mine
          ? "rounded-br-md border border-slate-200/70 bg-white text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          : "rounded-bl-md border border-slate-200/90 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      }`;
    const bubbleMeta =
      `m-0 text-[11px] leading-none opacity-70 ${mine ? "text-slate-500 dark:text-slate-400" : ""}`;
    /** 文字 <p leading-relaxed> 首行半行高；图顶垫同值 → meta→可见内容像素对齐 */
    const bubbleBodyTextPad =
      "padding-top: calc((1lh - 1em) / 2)";

    if (kind === "sticker") {
      const glyph = m.text ||
        (m.media?.url?.startsWith("sticker:")
          ? stickerById(m.media.url.slice(8))?.emoji
          : "") ||
        "🎨";
      return (
        <div class={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <div class="px-2 py-1">
            <span class="text-5xl leading-none drop-shadow-sm">{glyph}</span>
            <p class={`m-0 mt-1 text-[10px] ${mine ? "text-right text-slate-400" : "text-slate-400"}`}>
              {formatTime(m.time)}
            </p>
          </div>
        </div>
      );
    }

    if (kind === "image" && (abs || m.media?.thumbUrl)) {
      const thumbSrc = m.media?.thumbUrl
        ? mediaAbsUrl(mediaBase, m.media.thumbUrl, token, isAdmin)
        : abs;
      const fullSrc = abs || thumbSrc;
      const uploading = m.uploadStatus === "uploading";
      const failed = m.uploadStatus === "failed";
      // Uses shared bubbleShell／bubbleMeta (identical to text).
      return (
        <div class={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <div class={bubbleShell}>
            <p class={bubbleMeta}>
              {m.fromName}
              {m.fromRole === "admin" ? " · 在线客服" : ""}
              {" · "}
              {formatTime(m.time)}
            </p>
            {/* body：与文字 <p class="m-0"> 同级；间距=shell gap-1；顶垫=文字半行高（勿 leading-none 吃 gap） */}
            <div class="m-0 min-w-0" style={bubbleBodyTextPad}>
              <button
                type="button"
                class="relative m-0 block max-h-64 w-full overflow-hidden bg-slate-100 p-0 dark:bg-slate-900"
                style="line-height:0"
                disabled={uploading || failed}
                onClick={() => {
                  if (uploading || failed) return;
                  openImageViewer(fullSrc);
                }}
              >
                <img
                  src={thumbSrc}
                  alt={m.media?.name || "图片"}
                  class="m-0 block max-h-64 w-full object-cover"
                  ref={(el: HTMLImageElement | null) => {
                    onChatImageSettle(el);
                  }}
                  onLoad={() => scrollAfterMediaSettle()}
                  onError={() => scrollAfterMediaSettle()}
                />
                {uploading
                  ? (
                    <span
                      class="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white"
                      data-testid="web-chat-upload-mask"
                    >
                      正在上传
                    </span>
                  )
                  : null}
                {failed
                  ? (
                    <span
                      class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 px-2 text-center text-xs font-medium text-white"
                      data-testid="web-chat-upload-failed"
                    >
                      <span>上传失败</span>
                      <span class="text-[10px] font-normal leading-snug text-white/90">
                        {m.uploadError || "请重试"}
                      </span>
                    </span>
                  )
                  : null}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (kind === "file" && m.media) {
      const href = abs;
      return (
        <div class={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <a
            href={href || "#"}
            target="_blank"
            rel="noreferrer"
            class={`flex max-w-[82%] items-center gap-3 rounded-2xl px-3.5 py-3 text-sm shadow-sm no-underline ${
              mine
                ? "rounded-br-md border border-slate-200/70 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            <span class={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${mine ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200" : "bg-indigo-50 text-violet-600 dark:bg-slate-700"}`}>
              📎
            </span>
            <span class="min-w-0">
              <span class="block truncate font-medium">{m.media.name || m.text || "文件"}</span>
              <span class={`block text-[11px] ${mine ? "text-slate-400" : "text-slate-400"}`}>
                {m.uploadStatus === "uploading"
                  ? "正在上传…"
                  : m.uploadStatus === "failed"
                  ? (m.uploadError || "上传失败")
                  : `${formatBytes(m.media.size || 0)} · ${formatTime(m.time)}`}
              </span>
            </span>
          </a>
        </div>
      );
    }

    if (kind === "voice" && m.media) {
      const src = abs;
      const active = playingId.value === m.id;
      return (
        <div class={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <div
            class={`flex max-w-[82%] items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-sm ${
              mine
                ? "rounded-br-md border border-slate-200/70 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800"
            }`}
          >
            <button
              type="button"
              class={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${mine ? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100" : "bg-violet-50 text-violet-700"}`}
              onClick={() => {
                const audio = (globalThis as any).document.getElementById(`wc-audio-${m.id}`) as any;
                if (!audio) return;
                if (audio.paused) {
                  (globalThis as any).document.querySelectorAll("audio[data-wc-voice]").forEach((el: any) => {
                    (el as any).pause();
                  });
                  void audio.play();
                  playingId.value = m.id;
                } else {
                  audio.pause();
                  playingId.value = "";
                }
              }}
            >
              {active ? "❚❚" : "▶"}
            </button>
            <div class="min-w-[7rem]">
              <div class={`mb-1 h-1.5 overflow-hidden rounded-full ${mine ? "bg-slate-200 dark:bg-slate-600" : "bg-slate-200 dark:bg-slate-600"}`}>
                <div class={`h-full w-2/3 rounded-full ${mine ? "bg-slate-400" : "bg-violet-500"}`} />
              </div>
              <p class={`m-0 text-[11px] ${mine ? "text-slate-400" : "text-slate-400"}`}>
                {formatDuration(m.media.durationMs)} · {formatTime(m.time)}
              </p>
            </div>
            <audio
              id={`wc-audio-${m.id}`}
              data-wc-voice="1"
              src={src}
              preload="metadata"
              onEnded={() => {
                if (playingId.value === m.id) playingId.value = "";
              }}
              class="hidden"
            />
          </div>
        </div>
      );
    }

    // text / emoji / fallback — same bubbleShell／bubbleMeta as image
    return (
      <div class={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div class={bubbleShell}>
          <p class={bubbleMeta}>
            {m.fromName}
            {m.fromRole === "admin" ? " · 在线客服" : ""}
            {" · "}
            {formatTime(m.time)}
          </p>
          <p class="m-0 whitespace-pre-wrap break-words">{m.text}</p>
        </div>
      </div>
    );
  }

  const toolBtn = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-[10px] text-base transition ${
      active
        ? "bg-[#7c3aed]/15 text-[#7c3aed] dark:bg-[#7c3aed]/35 dark:text-violet-200"
        : "bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-[#7c3aed] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-violet-200"
    }`;
  /** Override Icon baked-in gray so toolbar inherits button text color (dark-readable). */
  const toolIconClass = "text-inherit dark:text-inherit";

  return (
    <div
      class={rootClass}
      data-testid="web-chat"
      ref={(el: HTMLElement | null) => {
        rootEl = el;
        if (el && inBrowser) {
          globalThis.requestAnimationFrame(() => patchTitleStatus());
        }
      }}
    >
      {/* 壳已有标题时 hideHeader：不画内头（FE／admin float）；/chat 全页／mobile 仍留标题头＋状态挂点 */}
      {!hideHeader
        ? (
      <div
        class="flex items-center justify-between gap-2 border-b border-indigo-100/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
        style="padding-top: max(0.75rem, env(safe-area-inset-top))"
      >
        <div class="flex min-w-0 items-center gap-2">
          <h1 class="m-0 truncate text-[15px] font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            {props.title || "在线客服"}
          </h1>
          {/* 静态挂点：连接变化只 DOM patch，不订进 view signal */}
          <span
            data-webchat-title-status=""
            data-testid="webchat-title-status"
            class="hidden shrink-0 items-center gap-1.5 text-xs font-normal text-slate-500 dark:text-slate-400"
            aria-live="polite"
          />
        </div>
      </div>
        )
        : null}


      {() => {
        // Guest contact gate — block chat/WS until phone|email validated & session open.
        // Root-cause fix (same as composer): outer IIFE must NOT subscribe to
        // contactDraft / contactError / loading — that remounted the Input on
        // every keystroke (focus loss). Only gate on guestReady; bind value/
        // disabled/error with fine-grained prop effects inside a stable tree.
        if (!isAdmin && !guestReady.value) {
          return (
            <div
              class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-8"
              data-testid="web-chat-contact-gate"
            >
              <div class="w-full max-w-sm space-y-3 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 class="m-0 text-base font-semibold text-slate-800 dark:text-slate-100">
                  开始咨询
                </h2>
                <p class="m-0 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  请先填写手机号或邮箱，方便客服联系您。
                </p>
                <form
                  class="space-y-3"
                  onSubmit={(e: Event) => submitContactGate(e)}
                >
                  <label class="block space-y-1.5">
                    <span class="text-xs font-medium text-slate-600 dark:text-slate-300">
                      电话或邮箱
                    </span>
                    {/*
                      Stable <input>: value/disabled via fine-grained accessors —
                      do NOT wrap this control in a draft-reading {() => ...}.
                    */}
                    <input
                      type="text"
                      data-testid="web-chat-contact-input"
                      class="box-border w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-400/40 placeholder:text-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="手机号或邮箱"
                      autocomplete="tel email"
                      value={() => contactDraft.value}
                      disabled={() => loading.value}
                      onInput={(e: Event) => {
                        contactDraft.value = (e.target as HTMLInputElement).value;
                        if (contactError.value) contactError.value = "";
                      }}
                    />
                  </label>
                  {() =>
                    contactError.value
                      ? (
                        <p
                          class="m-0 text-xs text-rose-600 dark:text-rose-400"
                          data-testid="web-chat-contact-error"
                        >
                          {contactError.value}
                        </p>
                      )
                      : null}
                  <button
                    type="submit"
                    data-testid="web-chat-contact-submit"
                    class="flex h-10 w-full items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                    disabled={() => loading.value}
                  >
                    {() => loading.value ? "连接中…" : "进入会话"}
                  </button>
                </form>
              </div>
            </div>
          );
        }
        return null;
      }}

      {() => {
        if (!isAdmin && !guestReady.value) return null;
        return (
      <div class={`flex min-h-0 flex-1 ${isAdmin ? "flex-row" : "flex-col"}`}>
        {isAdmin
          ? (
            <aside class="flex min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
              {() => {
                // Subscribe claim tab + session list for badge count.
                void claimTab.value;
                void sessions.value;
                const pending = pendingClaimCount();
                return (
                  <Tabs
                    activeKey={claimTab.value}
                    onChange={(k: string) => {
                      if (k === "mine" || k === "pending") claimTab.value = k;
                    }}
                    type="line"
                    fullWidth
                    class="bg-inherit px-1 pt-1"
                    panelClass="!hidden !p-0 !m-0 !border-0 !h-0 !overflow-hidden"
                    items={[
                      {
                        key: "mine",
                        label: (
                          <Text class="text-sm font-medium" data-testid="cs-tab-mine">
                            我的
                          </Text>
                        ),
                        children: null,
                      },
                      {
                        key: "pending",
                        label: (
                          <span
                            class="inline-flex items-center gap-1"
                            data-testid="cs-tab-pending"
                          >
                            <Text class="text-sm font-medium">待认领</Text>
                            {pending > 0
                              ? (
                                <Badge
                                  variant="warning"
                                  size="xs"
                                  count={pending}
                                  class="!bg-orange-500 !text-white dark:!bg-orange-500"
                                  data-testid="cs-pending-badge"
                                />
                              )
                              : null}
                          </span>
                        ),
                        children: null,
                      },
                    ] as never}
                  />
                );
              }}
              <ul class="m-0 min-h-0 list-none flex-1 overflow-y-auto p-0">
                {() => {
                  void claimTab.value;
                  void adminId.value;
                  const rows = sessionsForClaimTab();
                  // Subscribe so controlled Popconfirm open flips with list render.
                  void deleteConfirmId.value;
                  if (loading.value && sessions.value.length === 0) {
                    return (
                      <li class="p-4 text-center">
                        <Text class="text-xs text-slate-400">加载中…</Text>
                      </li>
                    );
                  }
                  if (rows.length === 0) {
                    return (
                      <li class="p-4">
                        <Empty
                          simple
                          description={claimTab.value === "pending"
                            ? "暂无待认领会话"
                            : "暂无我的会话"}
                        />
                      </li>
                    );
                  }
                  return rows.map((row) => {
                    const active = row.id === selectedId.value;
                    const coarse = isCoarse.value;
                    const open = coarse && swipeOpenId.value === row.id;
                    const av = guestAvatarMeta(row.id, row.guestName);
                    const unclaimed = isUnclaimed(row);
                    const rowBody = (
                      <div class="block w-full cursor-pointer px-3 py-3 text-left text-sm select-none">
                        {/* WeChat-style: rounded-square avatar + name/preview column. */}
                        <div class="flex items-center gap-2.5">
                          <span
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-sm"
                            style={{
                              background: av.bg,
                              filter: row.online ? "none" : "grayscale(1)",
                              opacity: row.online ? "1" : "0.72",
                            }}
                            title={row.online ? "在线" : "离线"}
                            aria-label={row.online ? "在线" : "离线"}
                          >
                            {av.label}
                          </span>
                          <Stack
                            direction="column"
                            gap={1}
                            align="stretch"
                            class="min-w-0 flex-1"
                          >
                            {/* Name + preview share the same left edge (Stack stretch). */}
                            <Text class="block w-full text-left font-medium text-slate-800 dark:text-slate-100">
                              {row.guestName}
                            </Text>
                            <Text
                              truncate
                              class="block w-full text-left text-xs text-slate-500 dark:text-slate-400"
                            >
                              {row.lastPreview || "(尚无消息)"}
                            </Text>
                            {unclaimed && canClaim
                              ? (
                                <Button
                                  size="xs"
                                  variant="primary"
                                  class="self-start"
                                  data-testid="cs-claim-btn"
                                  onClick={(e: Event) => {
                                    e.stopPropagation();
                                    e.preventDefault?.();
                                    void claimSession(row.id);
                                  }}
                                >
                                  认领
                                </Button>
                              )
                              : null}
                          </Stack>
                        </div>
                      </div>
                    );
                    return (
                      <li
                        key={row.id}
                        class={`relative border-b border-slate-100 dark:border-slate-800 ${
                          coarse ? "overflow-hidden" : ""
                        }`}
                        data-testid="cs-session-row"
                        data-session-id={row.id}
                        data-swipe-open={open ? "1" : "0"}
                        data-pointer={coarse ? "coarse" : "fine"}
                      >
                        {coarse
                          ? (
                            <>
                              <div
                                class={`absolute inset-y-0 right-0 z-0 flex ${
                                  open ? "pointer-events-auto" : "pointer-events-none"
                                }`}
                                aria-hidden={open ? "false" : "true"}
                              >
                                {unclaimed && canClaim
                                  ? (
                                    <button
                                      type="button"
                                      class="flex w-16 items-center justify-center bg-orange-500 text-xs font-medium text-white"
                                      data-testid="cs-claim-swipe"
                                      tabIndex={open ? 0 : -1}
                                      onClick={(e: Event) => {
                                        e.stopPropagation();
                                        void claimSession(row.id);
                                      }}
                                    >
                                      认领
                                    </button>
                                  )
                                  : null}
                                {canHide
                                  ? (
                                    <button
                                      type="button"
                                      class="flex w-16 items-center justify-center bg-amber-500 text-xs font-medium text-white"
                                      tabIndex={open ? 0 : -1}
                                      onClick={(e: Event) => {
                                        e.stopPropagation();
                                        void hideSession(row.id);
                                      }}
                                    >
                                      隐藏
                                    </button>
                                  )
                                  : null}
                                {canRemove
                                  ? (
                                    <Popconfirm
                                      class="flex h-full"
                                      open={() => deleteConfirmId.value === row.id}
                                      placement="left"
                                      danger
                                      title="确定删除该会话？聊天记录将全部删除且不可恢复。"
                                      okText="删除"
                                      cancelText="取消"
                                      onOpenChange={(o: boolean) => {
                                        if (!o && deleteConfirmId.value === row.id) {
                                          deleteConfirmId.value = "";
                                        }
                                      }}
                                      onConfirm={() => {
                                        void deleteSession(row.id);
                                      }}
                                    >
                                      <button
                                        type="button"
                                        class="flex h-full w-16 items-center justify-center bg-rose-600 text-xs font-medium text-white"
                                        tabIndex={open ? 0 : -1}
                                        onClick={(e: Event) => {
                                          e.stopPropagation();
                                          openDeleteConfirm(row.id);
                                        }}
                                      >
                                        删除
                                      </button>
                                    </Popconfirm>
                                  )
                                  : null}
                              </div>
                              <div
                                class={`relative z-[1] w-full touch-pan-y ${
                                  active
                                    ? "bg-slate-100 dark:bg-slate-800"
                                    : "bg-white dark:bg-slate-900"
                                }`}
                                style={{
                                  transform: open ? "translateX(-8rem)" : "translateX(0)",
                                  transition: "transform 160ms ease-out",
                                  willChange: "transform",
                                }}
                                onPointerDown={(e: PointerEvent) => {
                                  const t = e.currentTarget as HTMLElement;
                                  if (e.pointerType === "mouse" && e.button !== 0) return;
                                  t.setPointerCapture?.(e.pointerId);
                                  (t as any)._sx = e.clientX;
                                  (t as any)._sy = e.clientY;
                                  (t as any)._moved = false;
                                  (t as any)._base = open ? -128 : 0;
                                  (t as any)._dragging = true;
                                  t.style.transition = "none";
                                }}
                                onPointerMove={(e: PointerEvent) => {
                                  const t = e.currentTarget as HTMLElement;
                                  if (!(t as any)._dragging) return;
                                  const dx = e.clientX - ((t as any)._sx as number);
                                  const dy = e.clientY - ((t as any)._sy as number);
                                  if (!((t as any)._moved)) {
                                    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                                    if (Math.abs(dy) > Math.abs(dx)) {
                                      (t as any)._dragging = false;
                                      return;
                                    }
                                    (t as any)._moved = true;
                                    if (swipeOpenId.value && swipeOpenId.value !== row.id) {
                                      swipeOpenId.value = "";
                                    }
                                  }
                                  const next = Math.min(0, Math.max(-128, ((t as any)._base as number) + dx));
                                  t.style.transform = `translateX(${next}px)`;
                                }}
                                onPointerUp={(e: PointerEvent) => {
                                  const t = e.currentTarget as HTMLElement;
                                  if (!(t as any)._dragging && !(t as any)._moved) {
                                    if (swipeOpenId.value && swipeOpenId.value !== row.id) {
                                      swipeOpenId.value = "";
                                    }
                                    selectSession(row.id);
                                    return;
                                  }
                                  const moved = !!(t as any)._moved;
                                  const dx = e.clientX - ((t as any)._sx as number);
                                  const base = (t as any)._base as number;
                                  const finalX = Math.min(0, Math.max(-128, base + dx));
                                  (t as any)._dragging = false;
                                  t.style.transition = "transform 160ms ease-out";
                                  if (!moved) {
                                    if (swipeOpenId.value && swipeOpenId.value !== row.id) {
                                      swipeOpenId.value = "";
                                    } else if (open) {
                                      swipeOpenId.value = "";
                                    } else {
                                      selectSession(row.id);
                                    }
                                    const stillOpen = swipeOpenId.value === row.id;
                                    t.style.transform = stillOpen
                                      ? "translateX(-8rem)"
                                      : "translateX(0)";
                                    return;
                                  }
                                  const shouldOpen = finalX < -56;
                                  swipeOpenId.value = shouldOpen ? row.id : "";
                                  t.style.transform = shouldOpen
                                    ? "translateX(-8rem)"
                                    : "translateX(0)";
                                }}
                                onPointerCancel={(e: PointerEvent) => {
                                  const t = e.currentTarget as HTMLElement;
                                  (t as any)._dragging = false;
                                  t.style.transition = "transform 160ms ease-out";
                                  t.style.transform = swipeOpenId.value === row.id
                                    ? "translateX(-8rem)"
                                    : "translateX(0)";
                                }}
                              >
                                {rowBody}
                              </div>
                            </>
                          )
                          : (
                            <Popconfirm
                              class={`relative z-[1] block w-full ${
                                active
                                  ? "bg-slate-100 dark:bg-slate-800"
                                  : "bg-white dark:bg-slate-900"
                              }`}
                              open={() => deleteConfirmId.value === row.id}
                              placement="right"
                              danger
                              title="确定删除该会话？聊天记录将全部删除且不可恢复。"
                              okText="删除"
                              cancelText="取消"
                              onOpenChange={(o: boolean) => {
                                if (!o && deleteConfirmId.value === row.id) {
                                  deleteConfirmId.value = "";
                                }
                              }}
                              onConfirm={() => {
                                void deleteSession(row.id);
                              }}
                            >
                              <ContextMenu
                                class="block w-full"
                                items={[
                                  ...(unclaimed && canClaim
                                    ? [{
                                      key: "claim",
                                      label: "认领",
                                      icon: <IconUserPlus size="sm" />,
                                      onClick: () => {
                                        void claimSession(row.id);
                                      },
                                    }]
                                    : []),
                                  ...(canHide
                                    ? [{
                                      key: "hide",
                                      label: "隐藏",
                                      icon: <IconEyeOff size="sm" />,
                                      onClick: () => {
                                        void hideSession(row.id);
                                      },
                                    }]
                                    : []),
                                  ...(canRemove
                                    ? [{
                                      key: "delete",
                                      label: "删除",
                                      danger: true,
                                      icon: <IconTrash size="sm" />,
                                      onClick: () => {
                                        // Defer past ContextMenu document click so Popconfirm stays open.
                                        openDeleteConfirmDeferred(row.id);
                                      },
                                    }]
                                    : []),
                                ]}
                              >
                                <div
                                  data-testid="cs-session-ctx-trigger"
                                  onClick={() => selectSession(row.id)}
                                >
                                  {rowBody}
                                </div>
                              </ContextMenu>
                            </Popconfirm>
                          )}
                      </li>
                    );
                  });
                }}
              </ul>
            </aside>
          )
          : null}

        <section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-testid="cs-chat-pane">
          {() => {
            // WeChat-style: unselected admin → whole right pane empty (no header/msgs/composer).
            if (isAdmin && !selectedId.value) {
              return (
                <div
                  class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-slate-50/80 px-6 dark:bg-slate-950/60"
                  data-testid="cs-chat-empty-pane"
                >
                  <div
                    class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200/70 text-2xl font-bold tracking-tight text-slate-400/80 shadow-sm dark:bg-slate-800/70 dark:text-slate-500"
                    aria-hidden="true"
                  >
                    CS
                  </div>
                  <Text class="text-sm text-slate-400 dark:text-slate-500">
                    请选择左侧会话
                  </Text>
                </div>
              );
            }
            // Fixed-height thread: pane fills viewport; list scrolls; composer stays at bottom.
            return (
              <div
                class="flex min-h-0 flex-1 flex-col overflow-hidden"
                data-testid="cs-chat-thread"
              >
          <div
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-indigo-50/40 to-slate-100/80 px-4 py-4 dark:from-slate-950/50 dark:to-slate-950/80"
            ref={(el: any) => { bindListEl(el); }}
            data-testid="web-chat-message-list"
          >
            <div
              class="space-y-3"
              ref={(el: any) => { bindListContent(el); }}
            >
            {() => {
              const rows = liveMessages.value;
              if (!selectedId.value) {
                return (
                  <Empty
                    description="正在接入在线客服…"
                    class="py-16"
                  />
                );
              }
              const chatRows = rows.filter((m) => !m.system && m.fromRole !== "system");
              // 仅有居中系统消息时仍渲染（guest 连接状态），不盖 Empty
              if (chatRows.length === 0 && rows.length === 0) {
                return (
                  <Empty
                    simple
                    description={isAdmin ? "等待访客消息…" : "请描述您的问题，也可发图／语音"}
                    class="py-16"
                  />
                );
              }
              return rows.map((m) => (
                <div key={m.id}>{renderBubble(m)}</div>
              ));
            }}
            </div>
          </div>

          {() => {
            if (!recording.value) return null;
            return (
              <div class="flex shrink-0 items-center justify-between gap-3 border-t border-rose-100 bg-rose-50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/40">
                <span class="flex items-center gap-2 text-sm font-medium text-rose-600">
                  <span class="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                  录音中 {formatDuration(recordMs.value)}
                </span>
                <div class="flex gap-2">
                  <Button type="button" variant="ghost" onClick={cancelRecord}>取消</Button>
                  <Button type="button" variant="primary" onClick={stopRecord}>完成</Button>
                </div>
              </div>
            );
          }}

          <div
            class="relative shrink-0 border-t border-indigo-100 bg-white dark:border-slate-700 dark:bg-slate-900"
            style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom))"
            data-testid="web-chat-composer-bar"
          >
            {() => {
              const pan = panel.value;
              if (!showEmoji || pan === "none") return null;
              const tab = pickerTab.value;
              return (
                <div
                  class="absolute bottom-full left-0 right-0 z-20 flex h-56 flex-col overflow-hidden border border-b-0 border-indigo-100 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900"
                  data-testid="web-chat-panel"
                >
                  <div class="min-h-0 flex-1 overflow-y-auto p-3">
                    {tab === "emoji"
                      ? (
                        <div class="grid grid-cols-8 gap-1 sm:grid-cols-10">
                          {WEBCHAT_EMOJI.map((e) => (
                            <button
                              type="button"
                              key={e}
                              class="flex h-9 items-center justify-center rounded-lg text-xl hover:bg-violet-50 dark:hover:bg-slate-800"
                              onMouseDown={keepComposerFocus}
                              onClick={() => insertEmoji(e)}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )
                      : (
                        <div class="grid grid-cols-4 gap-2 sm:grid-cols-8">
                          {WEBCHAT_STICKERS.map((s) => (
                            <button
                              type="button"
                              key={s.id}
                              class="flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-violet-50 dark:hover:bg-slate-800"
                              onMouseDown={keepComposerFocus}
                              onClick={() => sendSticker(s.id)}
                              title={s.label}
                            >
                              <span class="text-3xl leading-none">{s.emoji}</span>
                              <span class="text-[10px] text-slate-400">{s.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  <div class="flex shrink-0 items-center gap-1 border-t border-indigo-100 px-2 pb-1.5 pt-1 dark:border-slate-700">
                    <button
                      type="button"
                      class={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        tab === "emoji"
                          ? "bg-violet-50 text-[#7c3aed] dark:bg-[#7c3aed]/25 dark:text-violet-200"
                          : "text-slate-500 hover:text-[#7c3aed] dark:text-slate-400 dark:hover:text-violet-200"
                      }`}
                      data-testid="web-chat-picker-tab-emoji"
                      aria-selected={tab === "emoji"}
                      onMouseDown={keepComposerFocus}
                      onClick={() => {
                        pickerTab.value = "emoji";
                        focusComposer();
                      }}
                    >
                      表情
                    </button>
                    <button
                      type="button"
                      class={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        tab === "sticker"
                          ? "bg-violet-50 text-[#7c3aed] dark:bg-[#7c3aed]/25 dark:text-violet-200"
                          : "text-slate-500 hover:text-[#7c3aed] dark:text-slate-400 dark:hover:text-violet-200"
                      }`}
                      data-testid="web-chat-picker-tab-sticker"
                      aria-selected={tab === "sticker"}
                      onMouseDown={keepComposerFocus}
                      onClick={() => {
                        pickerTab.value = "sticker";
                        focusComposer();
                      }}
                    >
                      贴纸
                    </button>
                  </div>
                </div>
              );
            }}

            {showToolbar
              ? (
                <div
                  class="flex items-center gap-1.5 px-3 pt-2.5"
                  data-testid="web-chat-toolbar"
                >
                  {() => (
                    <>
                      {showEmoji
                        ? (
                          <button
                            type="button"
                            class={toolBtn(panel.value === "picker")}
                            title="表情与贴纸"
                            aria-label="表情与贴纸"
                            data-testid="web-chat-picker-btn"
                            onMouseDown={keepComposerFocus}
                            onClick={() => {
                              panel.value = panel.value === "picker" ? "none" : "picker";
                              focusComposer();
                            }}
                          >
                            <IconSmile size="xs" class={toolIconClass} />
                          </button>
                        )
                        : null}
                      {showImage
                        ? (
                          <button
                            type="button"
                            class={toolBtn(false)}
                            title="图片"
                            aria-label="图片"
                            data-testid="web-chat-image-btn"
                            onMouseDown={keepComposerFocus}
                            onClick={() => imageInput?.click()}
                          >
                            <IconImage size="xs" class={toolIconClass} />
                          </button>
                        )
                        : null}
                      {showAttachment
                        ? (
                          <button
                            type="button"
                            class={toolBtn(false)}
                            title="文件"
                            aria-label="文件"
                            data-testid="web-chat-attachment-btn"
                            onMouseDown={keepComposerFocus}
                            onClick={() => fileInput?.click()}
                          >
                            <IconPaperClip size="xs" class={toolIconClass} />
                          </button>
                        )
                        : null}
                      {showVoice
                        ? (
                          <button
                            type="button"
                            class={toolBtn(recording.value)}
                            title="语音"
                            aria-label="语音"
                            data-testid="web-chat-voice-btn"
                            onMouseDown={keepComposerFocus}
                            onClick={() => {
                              if (recording.value) stopRecord();
                              else void startRecord();
                            }}
                          >
                            <IconMic size="xs" class={toolIconClass} />
                          </button>
                        )
                        : null}
                    </>
                  )}
                </div>
              )
              : null}
            <div class="flex items-end gap-2 px-3 pb-3 pt-2">
              <div class="min-w-0 flex-1 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50 focus-within:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-slate-400">
                {/*
                  Pending preview: thumb + ✕ + same-row compact input (cursor after thumb).
                  No empty TextArea row /「输入消息…」placeholder while preview is set.
                  No pending → normal TextArea + placeholder.
                  Remount only on preview null↔set (not every draft keystroke).
                  Send / Enter → confirmPreview; ✕ → clearPreview. Never silent-send.
                */}
                {() => {
                  const p = preview.value;
                  const busy = false; // upload progress lives on bubble, not composer
                  const onInput = (e: Event) => {
                    draft.value = (e.target as HTMLTextAreaElement).value;
                    autosizeComposer();
                  };
                  const onPaste = (e: Event) => {
                    const pe = e as ClipboardEvent;
                    if (showImage) {
                      const img = fileFromClipboard(pe);
                      if (img) {
                        pe.preventDefault();
                        pickImage(img);
                        return;
                      }
                    }
                    requestAnimationFrame(autosizeComposer);
                  };
                  const onKeyDown = (e: Event) => {
                    const ke = e as KeyboardEvent;
                    if (ke.key !== "Enter" || ke.shiftKey) return;
                    // 中文等 IME：候选确认前的 Enter 勿发送（isComposing / keyCode 229 / 本地 flag）
                    if (
                      composerComposing ||
                      ke.isComposing ||
                      (ke as unknown as { keyCode?: number }).keyCode === 229
                    ) {
                      return;
                    }
                    ke.preventDefault();
                    sendText();
                  };
                  const onCompositionStart = () => {
                    composerComposing = true;
                  };
                  const onCompositionEnd = () => {
                    composerComposing = false;
                  };
                  if (!p) {
                    return (
                      <textarea
                        ref={(el: any) => { composerInput = el; }}
                        data-testid="web-chat-composer"
                        rows={1}
                        class="box-border min-h-9 w-full resize-none overflow-y-hidden border-0 bg-transparent px-3 py-2 text-sm leading-5 text-slate-800 outline-none ring-0 placeholder:text-slate-400 dark:text-slate-100"
                        style={`max-height:${COMPOSER_MAX_H_PX}px`}
                        value={() => draft.value}
                        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                        onInput={onInput}
                        onPaste={onPaste}
                        onKeyDown={onKeyDown}
                        onCompositionStart={onCompositionStart}
                        onCompositionEnd={onCompositionEnd}
                      />
                    );
                  }
                  const thumb = p.kind === "image"
                    ? (
                      <div class="relative inline-block shrink-0" data-testid="web-chat-preview">
                        <img
                          src={p.blobUrl}
                          alt="预览"
                          class="h-9 w-9 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-600"
                        />
                        <button
                          type="button"
                          class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px] leading-none text-white shadow hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
                          aria-label="删除预览"
                          title="删除"
                          disabled={busy}
                          onClick={() => clearPreview()}
                        >
                          ×
                        </button>
                      </div>
                    )
                    : p.kind === "voice"
                    ? (
                      <div
                        class="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-white px-2 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600"
                        data-testid="web-chat-preview"
                      >
                        <span>🎤 {formatDuration(p.durationMs)}</span>
                        <button
                          type="button"
                          class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px] leading-none text-white shadow hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
                          aria-label="删除预览"
                          title="删除"
                          disabled={busy}
                          onClick={() => clearPreview()}
                        >
                          ×
                        </button>
                      </div>
                    )
                    : (
                      <div
                        class="relative inline-flex h-9 max-w-[40%] shrink-0 items-center gap-1 rounded-md bg-white px-2 text-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-600"
                        data-testid="web-chat-preview"
                      >
                        <span class="shrink-0">📎</span>
                        <span class="truncate">{p.name}</span>
                        <button
                          type="button"
                          class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px] leading-none text-white shadow hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
                          aria-label="删除预览"
                          title="删除"
                          disabled={busy}
                          onClick={() => clearPreview()}
                        >
                          ×
                        </button>
                      </div>
                    );
                  return (
                    <div class="flex items-center gap-2 px-2 py-1">
                      {thumb}
                      <textarea
                        ref={(el: any) => { composerInput = el; }}
                        data-testid="web-chat-composer"
                        rows={1}
                        class="box-border min-h-8 min-w-0 flex-1 resize-none overflow-y-hidden border-0 bg-transparent px-1 py-1.5 text-sm leading-5 text-slate-800 outline-none ring-0 placeholder:text-slate-400 dark:text-slate-100"
                        style={`max-height:${COMPOSER_MAX_H_PX}px`}
                        value={() => draft.value}
                        placeholder=""
                        onInput={onInput}
                        onPaste={onPaste}
                        onKeyDown={onKeyDown}
                        onCompositionStart={onCompositionStart}
                        onCompositionEnd={onCompositionEnd}
                      />
                    </div>
                  );
                }}
              </div>
              {() => (
                <button
                  type="button"
                  class="h-9 shrink-0 rounded-[10px] border border-slate-300 bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:disabled:border-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                  onClick={sendText}
                >
                  发送
                </button>
              )}
            </div>
          </div>
              </div>
            );
          }}
        </section>
      </div>
        );
      }}


      {showImage
        ? (
          <input
            ref={(el: any) => { imageInput = el; }}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            data-testid="web-chat-image-input"
            onChange={(e: Event) => {
              const f = (e.target as any).files?.[0];
              if (f) pickImage(f);
              (e.target as any).value = "";
            }}
          />
        )
        : null}
      {showAttachment
        ? (
          <input
            ref={(el: any) => { fileInput = el; }}
            type="file"
            accept={attachmentAcceptAttr}
            class="hidden"
            data-testid="web-chat-attachment-input"
            onChange={(e: Event) => {
              const f = (e.target as any).files?.[0];
              if (f) pickFile(f);
              (e.target as any).value = "";
            }}
          />
        )
        : null}

      {/* ui-view ImageViewer：Portal→body，避开 Modal transform／overflow 裁切，正式全屏遮罩 */}
      {inBrowser
        ? (
          <Portal mount={globalThis.document.body}>
            {() => {
              // 订阅 epoch：每次打开用最新 snap 重挂，保证多图按钮／缩略图正确。
              void viewerEpoch.value;
              const imgs = viewerImagesSnap.length > 0 ? viewerImagesSnap : [""];
              return (
                <ImageViewer
                  open={viewerOpen}
                  onClose={() => { viewerOpen.value = false; }}
                  images={imgs}
                  currentIndex={viewerIndex}
                  onIndexChange={(i) => { viewerIndex.value = i; }}
                  maskClosable
                  keyboard
                  showThumbnails
                />
              );
            }}
          </Portal>
        )
        : null}
    </div>
  );
}
