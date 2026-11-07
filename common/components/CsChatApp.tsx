/**
 * Customer-service chat UI (admin new-window page + FE/mobile guest).
 * Realtime: @dreamer/websocket/client → api `/ws`, rooms `cs:{sessionId}`.
 */
import { createEffect, createSignal, onCleanup, onMount } from "@dreamer/view";
import { Button, Empty, Input } from "@dreamer/ui-view";
import { Client } from "@dreamer/websocket/client";
import { apiPublicBase } from "@common/utils/cs-ws.ts";

export type CsMode = "admin" | "guest";

interface SessionRow {
  id: string;
  guestName: string;
  status: string;
  lastPreview: string;
  updatedAt: string;
}

interface ChatMsg {
  id: string;
  fromName: string;
  fromRole?: string;
  text: string;
  time: string;
  mine?: boolean;
}

function roomOf(id: string): string {
  return `cs:${id}`;
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Patch Client so inbound events are not echoed back to the server. */
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

export function CsChatApp(props: {
  mode: CsMode;
  /** Admin: same-origin /api/chat/*. Guest: api origin (default from env). */
  apiBase?: string;
  title?: string;
}) {
  const mode = props.mode;
  const isAdmin = mode === "admin";
  const guestApi = props.apiBase || apiPublicBase();

  const sessions = createSignal<SessionRow[]>([]);
  const selectedId = createSignal("");
  const liveMessages = createSignal<ChatMsg[]>([]);
  const draft = createSignal("");
  const wsState = createSignal<"off" | "connecting" | "on" | "joining" | "err">("off");
  const pendingLocal = createSignal<Set<string>>(new Set());
  const loading = createSignal(false);
  const statusNote = createSignal("");

  let wsUrl = "";
  let adminWsToken = "";
  let guestToken = "";
  let guestSessionId = "";
  let client: Client | null = null;
  let joinedId = "";
  let joined = false;
  let closed = false;
  const queue: string[] = [];

  function linkLabel() {
    const s = wsState.value;
    if (s === "on") return "已连接";
    if (s === "joining") return "进房中…";
    if (s === "connecting") return "连接中…";
    if (s === "err") return "连接异常";
    return "未连接";
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
      const text = queue.shift()!;
      client.emit("chat", { room: roomOf(joinedId), text });
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
        if (joinedId) {
          wsState.value = "joining";
          client?.emit("join", { room: roomOf(joinedId) });
        } else {
          wsState.value = "on";
        }
      });
      client.on("joined", (data: unknown) => {
        if (closed) return;
        const d = data as { room?: string; sessionId?: string };
        const sid = String(d?.sessionId ?? "").trim() ||
          (String(d?.room ?? "").startsWith("cs:")
            ? String(d?.room).slice(3)
            : "");
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
        const next: ChatMsg = {
          id: String(d.id),
          fromName: String(d.fromName ?? ""),
          fromRole: String(d.fromRole ?? ""),
          text: String(d.text ?? ""),
          time: String(d.time ?? ""),
          mine: isAdmin
            ? String(d.fromRole ?? "") === "admin"
            : String(d.fromRole ?? "") === "guest",
        };
        const cur = liveMessages.value;
        if (next.id && cur.some((m) => m.id === next.id)) return;
        if (next.mine) {
          const localIdx = cur.findIndex((m) =>
            m.id.startsWith("local-") &&
            m.text === next.text &&
            pendingLocal.value.has(m.id)
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

  async function loadAdminSessions() {
    loading.value = true;
    try {
      const res = await fetch("/api/chat/sessions", { credentials: "same-origin" });
      if (!res.ok) {
        wsState.value = "err";
        statusNote.value = "加载会话失败";
        return;
      }
      const data = await res.json() as {
        sessions?: SessionRow[];
        wsUrl?: string;
        adminWsToken?: string;
      };
      sessions.value = data.sessions ?? [];
      if (data.wsUrl) wsUrl = data.wsUrl;
      if (data.adminWsToken) adminWsToken = data.adminWsToken;
      if (wsUrl && adminWsToken) ensureWs(selectedId.value);
      else wsState.value = "err";
    } catch (e) {
      console.error("[cs-chat] load sessions", e);
      wsState.value = "err";
    } finally {
      loading.value = false;
    }
  }

  async function loadAdminDetail(id: string) {
    if (!id) {
      liveMessages.value = [];
      return;
    }
    try {
      const res = await fetch(
        `/api/chat/detail?sessionId=${encodeURIComponent(id)}`,
        { credentials: "same-origin" },
      );
      if (!res.ok) return;
      const data = await res.json() as { messages?: ChatMsg[] };
      liveMessages.value = (data.messages ?? []).map((m) => ({
        ...m,
        mine: m.fromRole === "admin",
      }));
      pendingLocal.value = new Set();
      ensureWs(id);
    } catch (e) {
      console.error("[cs-chat] load detail", e);
    }
  }

  async function bootGuest() {
    loading.value = true;
    try {
      const key = "dweb_admin_cs_guest";
      let saved: { sessionId: string; guestToken: string } | null = null;
      try {
        saved = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        saved = null;
      }
      if (saved?.sessionId && saved?.guestToken) {
        guestSessionId = saved.sessionId;
        guestToken = saved.guestToken;
        const res = await fetch(
          `${guestApi}/cs/detail?sessionId=${encodeURIComponent(guestSessionId)}&guestToken=${encodeURIComponent(guestToken)}`,
        );
        if (res.ok) {
          const data = await res.json() as {
            session?: SessionRow | null;
            messages?: ChatMsg[];
          };
          if (data.session) {
            selectedId.value = guestSessionId;
            liveMessages.value = (data.messages ?? []).map((m) => ({
              ...m,
              mine: m.fromRole === "guest",
            }));
          } else {
            saved = null;
          }
        } else {
          saved = null;
        }
      }
      if (!saved) {
        const res = await fetch(`${guestApi}/cs/open`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ guestName: "访客" }),
        });
        if (!res.ok) {
          wsState.value = "err";
          statusNote.value = "无法创建会话";
          return;
        }
        const data = await res.json() as {
          sessionId: string;
          guestToken: string;
          wsUrl?: string;
        };
        guestSessionId = data.sessionId;
        guestToken = data.guestToken;
        if (data.wsUrl) wsUrl = data.wsUrl;
        localStorage.setItem(
          key,
          JSON.stringify({ sessionId: guestSessionId, guestToken }),
        );
        selectedId.value = guestSessionId;
        liveMessages.value = [];
      }
      if (!wsUrl) {
        // derive from guestApi
        if (guestApi.startsWith("https://")) {
          wsUrl = `wss://${guestApi.slice(8)}/ws`;
        } else if (guestApi.startsWith("http://")) {
          wsUrl = `ws://${guestApi.slice(7)}/ws`;
        }
      }
      ensureWs(guestSessionId);
    } catch (e) {
      console.error("[cs-chat] guest boot", e);
      wsState.value = "err";
    } finally {
      loading.value = false;
    }
  }

  function selectSession(id: string) {
    if (selectedId.value === id) return;
    selectedId.value = id;
    void loadAdminDetail(id);
  }

  function send() {
    const text = draft.value.trim();
    if (!text || !selectedId.value) return;
    const localId = `local-${Date.now()}`;
    const nextSet = new Set(pendingLocal.value);
    nextSet.add(localId);
    pendingLocal.value = nextSet;
    liveMessages.value = [
      ...liveMessages.value,
      {
        id: localId,
        fromName: isAdmin ? "客服" : "我",
        fromRole: isAdmin ? "admin" : "guest",
        text,
        time: new Date().toISOString(),
        mine: true,
      },
    ];
    draft.value = "";
    if (joined && client?.connected) {
      client.emit("chat", { room: roomOf(selectedId.value), text });
    } else if (client?.connected) {
      queue.push(text);
      doJoin(selectedId.value);
    } else {
      wsState.value = "err";
    }
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
      });
    } else {
      void bootGuest();
    }
    onCleanup(() => dropWs());
  });

  createEffect(() => {
    // keep selected session reactive for title
    void selectedId.value;
  });

  return (
    <div
      class="flex h-full min-h-[28rem] flex-col gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="cs-chat-app"
    >
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <h1 class="m-0 text-base font-semibold text-slate-800 dark:text-slate-100">
            {props.title || (isAdmin ? "在线客服" : "联系客服")}
          </h1>
          <p class="m-0 mt-0.5 text-xs text-slate-500">{() => linkLabel()}</p>
        </div>
        {() =>
          statusNote.value
            ? <span class="text-xs text-rose-500">{statusNote.value}</span>
            : null}
      </div>

      <div class={`flex min-h-0 flex-1 ${isAdmin ? "flex-row" : "flex-col"}`}>
        {isAdmin
          ? (
            <aside class="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
              <ul class="m-0 list-none overflow-y-auto p-0">
                {() => {
                  const rows = sessions.value;
                  if (loading.value && rows.length === 0) {
                    return (
                      <li class="p-4 text-center text-xs text-slate-400">加载中…</li>
                    );
                  }
                  if (rows.length === 0) {
                    return (
                      <li class="p-4">
                        <Empty simple description="暂无访客会话" />
                      </li>
                    );
                  }
                  return rows.map((row) => {
                    const active = row.id === selectedId.value;
                    return (
                      <li key={row.id} class="border-b border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          class={`block w-full px-3 py-3 text-left text-sm ${
                            active
                              ? "bg-indigo-50 dark:bg-indigo-950/40"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                          onClick={() => selectSession(row.id)}
                        >
                          <span class="font-medium text-slate-800 dark:text-slate-100">
                            {row.guestName}
                          </span>
                          <p class="m-0 mt-1 truncate text-xs text-slate-500">
                            {row.lastPreview || "（尚无消息）"}
                          </p>
                        </button>
                      </li>
                    );
                  });
                }}
              </ul>
            </aside>
          )
          : null}

        <section class="flex min-w-0 flex-1 flex-col">
          <div class="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-950/40">
            {() => {
              const rows = liveMessages.value;
              if (!selectedId.value) {
                return <Empty description="请选择左侧会话" class="py-16" />;
              }
              if (rows.length === 0) {
                return (
                  <Empty
                    simple
                    description={isAdmin ? "等待访客消息…" : "请描述您的问题"}
                    class="py-16"
                  />
                );
              }
              return rows.map((m) => (
                <div
                  key={m.id}
                  class={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    class={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      m.mine
                        ? "rounded-br-md bg-indigo-500 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <p class={`mb-1 text-[11px] opacity-70 ${m.mine ? "text-white" : ""}`}>
                      {m.fromName}
                      {m.fromRole === "admin" ? " · 客服" : ""}
                      {" · "}
                      {formatTime(m.time)}
                    </p>
                    <p class="m-0 whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                </div>
              ));
            }}
          </div>
          <div class="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div class="min-w-0 flex-1">
              {() => (
                <Input
                  value={draft}
                  placeholder="输入消息，Enter 发送"
                  onInput={(e: Event) => {
                    draft.value = (e.target as unknown as { value: string }).value;
                  }}
                  onKeyDown={(e: Event) => {
                    const ke = e as Event & {
                      key?: string;
                      shiftKey?: boolean;
                      preventDefault: () => void;
                    };
                    if (ke.key === "Enter" && !ke.shiftKey) {
                      ke.preventDefault();
                      send();
                    }
                  }}
                />
              )}
            </div>
            <Button type="button" variant="primary" onClick={send}>
              发送
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
