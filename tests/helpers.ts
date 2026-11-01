/**
 * Shared test helpers: server bootstrap (reuses a running dev server, else spawns one),
 * CSRF-aware API client with login, and a Playwright browser helper.
 */
export const BASE = Deno.env.get("E2E_BASE") ?? "http://localhost:3100";
export const ADMIN_USER = Deno.env.get("SEED_ADMIN_USERNAME") ?? "admin";
export const ADMIN_PASS = Deno.env.get("SEED_ADMIN_PASSWORD") ?? "admin888";

let spawned: Deno.ChildProcess | null = null;

async function up(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    await r.body?.cancel();
    return r.status < 500;
  } catch {
    return false;
  }
}

/** Make sure the backend answers on BASE; spawn `backend/main.ts --dev` when nothing listens. */
export async function ensureServer(): Promise<void> {
  if (await up()) return;
  spawned = new Deno.Command(Deno.execPath(), {
    args: ["run", "--env-file=.env", "-A", "backend/main.ts", "--dev"],
    stdout: "null",
    stderr: "null",
  }).spawn();
  for (let i = 0; i < 120; i++) {
    if (await up()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`backend did not start on ${BASE}`);
}

export function stopServer(): void {
  try {
    spawned?.kill("SIGTERM");
  } catch { /* already gone */ }
  spawned = null;
}

/** Minimal cookie-jar fetch client with CSRF double-submit. */
export class Api {
  jar = new Map<string, string>();

  private store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      if (!v || /max-age=0/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
  }

  cookieHeader(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async req(method: string, path: string, body?: unknown): Promise<{ status: number; data: any; res: Response }> {
    if (!this.jar.has("_csrf") && method !== "GET") await this.req("GET", "/login");
    const headers: Record<string, string> = { cookie: this.cookieHeader(), accept: "application/json" };
    if (this.jar.has("_csrf")) headers["x-csrf-token"] = this.jar.get("_csrf")!;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
    this.store(res);
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch { /* html */ }
    return { status: res.status, data, res };
  }

  get = (p: string) => this.req("GET", p);
  post = (p: string, b?: unknown) => this.req("POST", p, b ?? {});

  async login(username = ADMIN_USER, password = ADMIN_PASS, extra: Record<string, unknown> = {}) {
    await this.req("GET", "/login");
    return await this.req("POST", "/api/auth/login", { username, password, ...extra });
  }
}

export async function adminApi(): Promise<Api> {
  await ensureServer();
  const a = new Api();
  const r = await a.login();
  if (r.status !== 200) throw new Error(`admin login failed: ${r.status} ${JSON.stringify(r.data)}`);
  return a;
}

/** Playwright: logged-in browser context (login via API so no captcha is needed). */
export async function browserLoggedIn(opts: { viewport?: { width: number; height: number }; cookies?: { name: string; value: string }[]; locale?: string } = {}) {
  await ensureServer();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: opts.viewport ?? { width: 1280, height: 800 }, locale: opts.locale });
  await ctx.request.get(BASE + "/login");
  const csrf = (await ctx.cookies()).find((c) => c.name === "_csrf")?.value ?? "";
  const r = await ctx.request.post(BASE + "/api/auth/login", { data: { username: ADMIN_USER, password: ADMIN_PASS }, headers: { "x-csrf-token": csrf } });
  if (r.status() !== 200) throw new Error("browser login failed " + r.status());
  if (opts.cookies?.length) await ctx.addCookies(opts.cookies.map((c) => ({ ...c, url: BASE })));
  return { browser, ctx };
}

/** CDP screenshot that does not wait for fonts/load (works while scripts are held back). */
export async function cdpShot(ctx: any, page: any, file?: string): Promise<Uint8Array> {
  const cdp = await ctx.newCDPSession(page);
  const r = await cdp.send("Page.captureScreenshot", { format: "png" });
  const bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
  if (file) await Deno.writeFile(file, bytes);
  return bytes;
}
