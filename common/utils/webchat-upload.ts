/**
 * Browser-only thin upload client for WebChat.
 * Speaks @dreamer/upload multipart protocol (init → chunk → complete) via fetch.
 * Intentionally avoids `@dreamer/upload/client` (pulls runtime-adapter → node:* into esbuild).
 * marker: WEBCHAT_THIN_UPLOAD_20261107
 */

export interface WebchatUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface WebchatUploadOptions {
  filename?: string;
  mimeType?: string;
  /** Session id folder on server (authorizeCsUpload path). */
  path?: string;
  onProgress?: (progress: WebchatUploadProgress) => void;
  chunkSize?: number;
  concurrency?: number;
  timeoutMs?: number;
}

export interface WebchatUploadResult {
  success: boolean;
  url?: string;
  /** Dual-image thumb from complete data/body (AVIF). */
  thumbUrl?: string;
  fileId?: string;
  size: number;
  filename: string;
  mimeType?: string;
  error?: string;
}

export interface WebchatUploadClientConfig {
  /** Base path including /ui-view-upload, e.g. http://127.0.0.1:8813/ui-view-upload */
  endpoint: string;
  token: string;
  chunkSize?: number;
  concurrency?: number;
  timeoutMs?: number;
}

interface InitResponse {
  uploadId: string;
  key?: string;
}

interface ChunkMeta {
  index: number;
  start: number;
  end: number;
  size: number;
  etag?: string;
}

interface CompleteResponse {
  fileId?: string;
  url?: string;
  thumbUrl?: string;
  data?: Record<string, unknown>;
}

/** Double-submit CSRF: cookie `_csrf` → header (admin same-origin / backend). */
function csrfToken(): string {
  try {
    const doc = (globalThis as { document?: { cookie?: string } }).document;
    const m = (doc?.cookie ?? "").match(/(?:^|;\s*)_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

function authHeaders(token: string, extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
  const csrf = csrfToken();
  if (csrf) headers["x-csrf-token"] = csrf;
  return headers;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      // same-origin: send cookies for CSRF; cross-origin api: Bearer only
      credentials: init.credentials ?? "same-origin",
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
      throw new Error(
        `upload HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }
    return await res.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

function planChunks(fileSize: number, chunkSize: number): ChunkMeta[] {
  const chunks: ChunkMeta[] = [];
  let offset = 0;
  let index = 0;
  while (offset < fileSize) {
    const start = offset;
    const end = Math.min(offset + chunkSize, fileSize);
    chunks.push({ index, start, end, size: end - start });
    index++;
    offset = end;
  }
  return chunks;
}

/**
 * Upload a File with the CS upload API. Returns { success, url } like UploadClient.
 */
export async function webchatUpload(
  file: File,
  config: WebchatUploadClientConfig,
  options: WebchatUploadOptions = {},
): Promise<WebchatUploadResult> {
  const endpoint = config.endpoint.replace(/\/$/, "");
  const token = config.token;
  const chunkSize = options.chunkSize ?? config.chunkSize ?? 1024 * 1024;
  const concurrency = Math.max(
    1,
    options.concurrency ?? config.concurrency ?? 2,
  );
  const timeoutMs = options.timeoutMs ?? config.timeoutMs ?? 60_000;
  const filename = options.filename || file.name || "file";
  const mimeType = options.mimeType || file.type || "application/octet-stream";
  const fileSize = file.size;

  try {
    const chunks = planChunks(fileSize, chunkSize);
    const init = await fetchJson<InitResponse>(
      `${endpoint}/init`,
      {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          filename,
          fileSize,
          chunks: chunks.length,
          mimeType,
          path: options.path,
        }),
      },
      timeoutMs,
    );

    if (!init.uploadId) {
      return {
        success: false,
        size: fileSize,
        filename,
        mimeType,
        error: "init missing uploadId",
      };
    }
    const key = init.key || filename;
    let completedSize = 0;

    const report = () => {
      options.onProgress?.({
        loaded: completedSize,
        total: fileSize,
        percentage: fileSize
          ? Math.round((completedSize / fileSize) * 100)
          : 100,
      });
    };
    report();

    let cursor = 0;
    const workers: Promise<void>[] = [];

    const runOne = async (chunk: ChunkMeta) => {
      const blob = file.slice(chunk.start, chunk.end);
      const form = new FormData();
      form.append("file", blob, filename);
      form.append("index", String(chunk.index));
      form.append("uploadId", init.uploadId);
      form.append("key", key);

      const chunkRes = await fetchJson<{ etag?: string }>(
        `${endpoint}/chunk`,
        {
          method: "POST",
          headers: authHeaders(token),
          body: form,
        },
        timeoutMs,
      );
      chunk.etag = chunkRes.etag;
      completedSize += chunk.size;
      report();
    };

    const pump = async () => {
      while (cursor < chunks.length) {
        const i = cursor++;
        await runOne(chunks[i]!);
      }
    };

    for (let i = 0; i < Math.min(concurrency, chunks.length || 1); i++) {
      workers.push(pump());
    }
    if (chunks.length === 0) {
      // empty file: still complete
    } else {
      await Promise.all(workers);
    }

    const complete = await fetchJson<CompleteResponse>(
      `${endpoint}/complete`,
      {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          uploadId: init.uploadId,
          key,
          chunks: chunks.map((c) => ({
            index: c.index,
            etag: c.etag,
            size: c.size,
          })),
        }),
      },
      timeoutMs,
    );

    report();
    const data = (complete.data ?? {}) as Record<string, unknown>;
    const thumbUrl =
      (typeof complete.thumbUrl === "string" && complete.thumbUrl) ||
      (typeof data.thumbUrl === "string" ? data.thumbUrl : undefined) ||
      undefined;
    const url =
      (typeof complete.url === "string" && complete.url) ||
      (typeof data.url === "string" ? data.url : undefined) ||
      undefined;
    return {
      success: true,
      url,
      thumbUrl,
      fileId: complete.fileId,
      size: fileSize,
      filename,
      mimeType,
    };
  } catch (e) {
    return {
      success: false,
      size: fileSize,
      filename,
      mimeType,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Drop-in shaped helper matching prior `new UploadClient(...).upload(...)` call site. */
export class WebchatUploadClient {
  constructor(private readonly config: WebchatUploadClientConfig) {}

  upload(file: File, options?: WebchatUploadOptions): Promise<WebchatUploadResult> {
    return webchatUpload(file, this.config, options);
  }
}
