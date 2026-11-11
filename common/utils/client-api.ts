/**
 * Browser-side fetch helper for the admin API.
 * Sends the double-submit CSRF token (cookie `_csrf` → header X-CSRF-Token).
 */
export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { error?: string; message?: string; fields?: string[] };
}

/** 从 `_csrf` cookie 读取双提交 CSRF token */
export function csrfToken(): string {
  const doc = (globalThis as { document?: { cookie?: string } }).document;
  const m = (doc?.cookie ?? "").match(/(?:^|;\s*)_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

/**
 * DataPanel / createApiDataSource 写请求用的 CSRF 头。
 * 无 cookie 时返回空对象（由中间件拒绝）。
 */
export function csrfHeaders(): HeadersInit {
  const token = csrfToken();
  return token ? { "X-CSRF-Token": token } : {};
}

export async function api<T = Record<string, unknown>>(
  method: string,
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
    let data: unknown = {};
    try {
      data = await res.json();
    } catch { /* empty body */ }
    return {
      ok: res.ok,
      status: res.status,
      data: data as ApiResult<T>["data"],
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "network" } as ApiResult<T>["data"],
    };
  }
}
