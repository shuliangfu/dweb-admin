/**
 * WebChat CS upload: thin wrap of uiViewUploadPlugin (localDir + dual + virusScan).
 * marker: WEBCHAT_UPLOAD_UIVIEW_PLUGIN_20261107
 *
 * Order (fixed): multipart complete（含可选 virusScan）→ afterComplete（若有）→ image.dual AVIF
 * → `{url,thumbUrl}`。杀毒改由 upload Handler `virusScan`（默认关；本仓按产品意图 enable）。
 * 文件下载：插件 onRequest `${basePath}/file?key=` + authorizeFile（guest 仅本 session）。
 *
 * ClamAV: brew install clamav → conf TCPSocket 3310 → freshclam → clamd
 * Env: CLAMAV_HOST (default 127.0.0.1), CLAMAV_PORT (3310),
 *      CLAMAV_REQUIRED (default required=true; set 0 only to degrade-allow),
 *      CLAMAV_ENABLE (default 1；设 0 关杀毒).
 * VirusTotal: onEvent hook only — never blocks sync send path.
 */
import type { App } from "@dreamer/dweb";
import {
  uiViewUploadPlugin,
  type UiViewUploadAuthContext,
  type UiViewUploadPlugin,
} from "@dreamer/ui-view/plugin/upload";
import { adminFromToken } from "@common/service/auth.ts";
import { hasPermission } from "@common/service/rbac.ts";
import {
  CS_UPLOAD_PATH_PREFIX,
  guestFromToken,
} from "@common/service/cs.ts";
import { getEnv } from "@common/utils/env.ts";

const UPLOAD_BASE = "/ui-view-upload";
/** 显式目录（插件必填 localDir；禁依赖插件隐式默认）。env CS_UPLOAD_DIR 可覆盖。 */
const LOCAL_DIR = getEnv("CS_UPLOAD_DIR") || "./uploads";

/** MIME allowlist — include video/webm|mp4 so voice blobs pass magic; + image/avif. */
export const CS_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // voice: declare video/* on client when browser reports audio/webm|audio/mp4
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "video/webm",
  "video/mp4",
];

export const CS_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB hard top (files)
export const CS_MAX_PART_SIZE = 5 * 1024 * 1024;

type UploadAuth = {
  userId?: string;
  claims?: Record<string, unknown>;
};

function bearerToken(request: Request): string {
  const h = request.headers.get("authorization") ||
    request.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  if (m) return m[1]!.trim();
  const url = new URL(request.url);
  return (
    url.searchParams.get("guestToken") ||
    url.searchParams.get("adminToken") ||
    request.headers.get("x-guest-token") ||
    request.headers.get("x-admin-token") ||
    ""
  ).trim();
}

async function authenticateUpload(
  request: Request,
): Promise<UploadAuth | Response> {
  const token = bearerToken(request);
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
  const guest = await guestFromToken(token);
  if (guest) {
    // String() so MultipartUploadHandler assertSessionOwner (===) matches across requests
    const sessionId = String(guest.sessionId);
    return {
      userId: sessionId,
      claims: {
        role: "guest",
        sessionId,
        guestName: guest.guestName,
      },
    };
  }
  const admin = await adminFromToken(token);
  if (admin) {
    // admin.id may be ObjectId-like; must be string for session owner === checks
    const adminId = String(admin.id);
    return {
      userId: adminId,
      claims: {
        role: "admin",
        adminId,
        name: admin.nickname || admin.username || "admin",
        roleCodes: admin.roleCodes ?? [],
        isSuper: !!admin.isSuper,
      },
    };
  }
  return new Response(
    JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}

async function authorizeCsUpload(
  ctx: unknown,
  init: unknown,
  _request: Request,
): Promise<boolean | Response> {
  const auth = ctx as UploadAuth | undefined;
  const body = init as { path?: string; filename?: string; mimeType?: string };
  const role = String(auth?.claims?.role ?? "");
  const path = String(body?.path ?? "").replace(/^\/+|\/+$/g, "");

  if (role === "guest") {
    const sid = String(auth?.claims?.sessionId ?? auth?.userId ?? "");
    if (!sid || path !== sid) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: path must be session id",
          code: "FORBIDDEN",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
    return true;
  }
  if (role === "admin") {
    const roleCodes = (auth?.claims?.roleCodes as string[] | undefined) ?? [];
    const isSuper = !!auth?.claims?.isSuper;
    if (!isSuper && roleCodes.length && !await hasPermission(roleCodes, "cs.upload")) {
      return new Response(
        JSON.stringify({ error: "无权限", code: "FORBIDDEN", message: "无权限" }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(path)) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: admin path must be session id",
          code: "FORBIDDEN",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
    return true;
  }
  return false;
}

/** guest 仅本 session；admin 可读任意 chat/（及过渡 cs/）下 key。 */
function authorizeCsFile(
  ctx: UiViewUploadAuthContext | undefined,
  key: string,
  _request: Request,
): boolean | Response {
  const role = String(ctx?.claims?.role ?? "");
  const parts = key.split("/");
  const prefixPart = parts[0] ?? "";
  const sessionPart = parts[1] ?? "";
  // 新 chat/；过渡仍可能见到 cs/（onRequest 会 remap，此处双认）
  if (prefixPart !== CS_UPLOAD_PATH_PREFIX && prefixPart !== "cs") {
    return new Response("Forbidden", { status: 403 });
  }
  if (role === "guest") {
    const sid = String(ctx?.claims?.sessionId ?? ctx?.userId ?? "");
    if (!sid || sid !== sessionPart) {
      return new Response("Forbidden", { status: 403 });
    }
    return true;
  }
  if (role === "admin") return true;
  return false;
}

function clamEnv() {
  return {
    enable: getEnv("CLAMAV_ENABLE") !== "0",
    host: getEnv("CLAMAV_HOST") || "127.0.0.1",
    port: Number(getEnv("CLAMAV_PORT") || "3310") || 3310,
    required: getEnv("CLAMAV_REQUIRED") !== "0",
  };
}

/**
 * ui-view upload plugin: app supplies localDir + auth + virusScan (+ dual).
 * File serve via plugin onRequest + authorizeFile.
 */
const clam = clamEnv();

export const csUploadPlugin: UiViewUploadPlugin = uiViewUploadPlugin({
  localDir: LOCAL_DIR,
  basePath: UPLOAD_BASE,
  publicFileBasePath: `${UPLOAD_BASE}/file`,
  image: { dual: true, thumbSize: 320, quality: 75 },
  // 产品意图：CS 开杀毒（guest 可传）；CLAMAV_ENABLE=0 可关
  virusScan: clam.enable
    ? {
      enable: true,
      host: clam.host,
      port: clam.port,
      required: clam.required,
    }
    : false,
  requireAuth: true,
  verifyContentAfterComplete: true,
  maxFileSize: CS_MAX_FILE_SIZE,
  maxPartSize: CS_MAX_PART_SIZE,
  allowedMimeTypes: CS_ALLOWED_MIME,
  pathPrefix: CS_UPLOAD_PATH_PREFIX,
  authenticate: authenticateUpload,
  authorizeUpload: authorizeCsUpload,
  authorizeFile: authorizeCsFile,
  serveFiles: true,
  onEvent: (event: unknown) => {
    const e = event as { type?: string; key?: string };
    if (e?.type === "complete") {
      // VirusTotal async hook placeholder (post-MVP). Never block sync path.
    }
  },
});

/**
 * Mongo／历史 URL 仍可能是 key=cs/…；插件 pathPrefix=chat 会 Bad key。
 * 下载前把 cs/ 重写为 chat/（物理已迁 uploads/chat；uploads/cs 为 symlink 兜底）。
 */
const _csUploadOnRequest = csUploadPlugin.onRequest?.bind(csUploadPlugin);
if (_csUploadOnRequest) {
  csUploadPlugin.onRequest = async (ctx, container) => {
    try {
      const key = (ctx.url?.searchParams?.get("key") ?? "").trim();
      if (key.startsWith("cs/") && !key.includes("..")) {
        const remapped = `chat/${key.slice(3)}`;
        ctx.url.searchParams.set("key", remapped);
      }
    } catch {
      // ignore remap errors; plugin will validate
    }
    return await _csUploadOnRequest(ctx, container);
  };
}

/** AppConfig.upload — same storage instance as plugin. */
export const csUploadAppConfig = csUploadPlugin.uploadConfig;

/** Shared storage for file serve / legacy callers. */
export const csUploadStorage = csUploadPlugin.storage;

/**
 * @deprecated 杀毒已由 virusScan 透传；保留日志供 ops 确认开关。
 */
export function installClamAvCompleteGuard(app: App): void {
  const { enable, host, port, required } = clamEnv();
  if (!app.container.has("uploadHandler")) {
    console.warn(
      "[cs-upload] uploadHandler missing; ensure AppConfig.upload = csUploadAppConfig",
    );
  }
  console.log(
    `[cs-upload] virusScan enable=${enable} → ${host}:${port} (required=${required}; order: complete→virusScan→dual; file via plugin onRequest)`,
  );
}

/**
 * @deprecated 文件下载已收进 uiViewUploadPlugin.onRequest；保留空安装以兼容 api/main。
 */
export function installUploadFileRoute(_app: App): void {
  // no-op: csUploadPlugin.onRequest serves `${UPLOAD_BASE}/file?key=`
}
