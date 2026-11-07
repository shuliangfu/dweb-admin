/** Action `sessions` → GET/POST /api/chat/sessions — admin CS session list + WS bootstrap. */
import type { ApiContext } from "@dreamer/dweb";
import {
  getCurrentUser,
  readAdminSessionToken,
} from "@common/service/auth.ts";
import { hasPermission } from "@common/service/rbac.ts";
import { createT, resolveLocale } from "@common/i18n/mod.ts";
import {
  getCsLobbyRowsByIds,
  listCsSessions,
} from "@common/service/cs.ts";
import { sortCsLobbyRows } from "@common/utils/cs-session-list.ts";
import { apiPublicBase, csWsUrl } from "@common/utils/cs-ws.ts";
import { getEnv } from "@common/utils/env.ts";
import { jsonResponse } from "@common/utils/http.ts";

/** Candidate HTTP origins for api-process /cs/online (memory presence). */
function livePresenceBases(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const b = raw.replace(/\/$/, "").trim();
    if (!b || seen.has(b)) return;
    seen.add(b);
    out.push(b);
  };
  push(apiPublicBase() || "");
  const port = getEnv("APP_PORT_API") || "8813";
  const host = getEnv("APP_HOST") || "127.0.0.1";
  push(`http://${host}:${port}`);
  push(`http://127.0.0.1:${port}`);
  push("http://127.0.0.1:8813");
  return out;
}

/** Pull live guest ids from api process memory (source of truth while WS is up). */
async function fetchLiveCsOnlineIds(): Promise<string[]> {
  const bases = livePresenceBases();
  let lastErr: unknown;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/cs/online`, {
        headers: { accept: "application/json", "cache-control": "no-store" },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} from ${base}`);
        continue;
      }
      const data = await res.json() as { ids?: unknown; marker?: string };
      if (!Array.isArray(data.ids)) {
        lastErr = new Error(`bad body from ${base}`);
        continue;
      }
      return data.ids.map((id) => String(id ?? "").trim()).filter(Boolean);
    } catch (e) {
      lastErr = e;
    }
  }
  console.error("[cs-sessions] live presence fetch failed", lastErr);
  return [];
}

export async function sessions(ctx: ApiContext) {
  const user = await getCurrentUser(ctx.req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  if (!await hasPermission(user.roleCodes, "cs.view")) {
    const tr = createT(resolveLocale(ctx.req));
    return jsonResponse({ error: "forbidden", message: tr("error.forbidden") }, 403);
  }
  // Live ids first so list filter treats connected guests as online (Mongo lag).
  const liveIds = await fetchLiveCsOnlineIds();
  const live = new Set(liveIds);
  const listed = await listCsSessions(80, live);
  const merged = listed.map((s) =>
    live.has(s.id) ? { ...s, online: true, hidden: false } : s
  );
  const seen = new Set(merged.map((s) => s.id));
  const missing = liveIds.filter((id) => !seen.has(id));
  if (missing.length) {
    const extra = await getCsLobbyRowsByIds(missing);
    for (const row of extra) {
      if (seen.has(row.id)) continue;
      merged.push({ ...row, online: true, hidden: false });
      seen.add(row.id);
    }
  }
  // Multi-agent claim: each admin only sees 待认领 (unclaimed) + 我的 (own).
  const visible = merged.filter((s) => {
    const by = s.claimedByAdminId != null
      ? String(s.claimedByAdminId).trim()
      : "";
    return !by || by === user.id;
  });
  // Online group first, offline after; within band lastMsg/updatedAt desc.
  const ordered = sortCsLobbyRows(visible);
  return jsonResponse({
    sessions: ordered,
    liveOnlineCount: liveIds.length,
    presenceMarker: "presence-live-v4",
    /** Current admin id — WebChat filters「我的」by claimedByAdminId === adminId. */
    adminId: user.id,
    adminName: user.nickname || user.username,
    wsUrl: csWsUrl(),
    adminWsToken: readAdminSessionToken(ctx.req),
  });
}
