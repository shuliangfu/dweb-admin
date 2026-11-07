/**
 * Shared test helpers: server bootstrap (reuses a running dev server, else spawns one),
 * CSRF-aware API client with login, and a Playwright browser helper.
 */
function envGet(key: string): string | undefined {
  try {
    // Deno
    // deno-lint-ignore no-explicit-any
    const d = (globalThis as any).Deno;
    if (d?.env?.get) return d.env.get(key);
  } catch { /* ignore */ }
  try {
    // Bun / Node
    // deno-lint-ignore no-explicit-any
    return (globalThis as any).process?.env?.[key];
  } catch {
    return undefined;
  }
}

export const BASE = envGet("E2E_BASE") ?? "http://127.0.0.1:3100";
export const ADMIN_USER = envGet("SEED_ADMIN_USERNAME") ?? "admin";
export const ADMIN_PASS = envGet("SEED_ADMIN_PASSWORD") ?? "admin888";

// deno-lint-ignore no-explicit-any
let spawned: any = null;

async function up(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    await r.body?.cancel();
    return r.status < 500;
  } catch {
    return false;
  }
}

/** Make sure the backend answers on BASE; spawn `deno … backend/main.ts --dev` when nothing listens. */
export async function ensureServer(): Promise<void> {
  if (await up()) return;
  // Always spawn via the Deno CLI so Bun/Node test runners can reuse the same server binary.
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (g.Deno?.Command) {
    spawned = new g.Deno.Command(g.Deno.execPath(), {
      args: ["run", "--env-file=.env", "-A", "backend/main.ts", "--dev"],
      stdout: "null",
      stderr: "null",
    }).spawn();
  } else {
    const { spawn } = await import("node:child_process");
    spawned = spawn("deno", ["run", "--env-file=.env", "-A", "backend/main.ts", "--dev"], {
      stdio: "ignore",
      detached: false,
    });
  }
  for (let i = 0; i < 120; i++) {
    if (await up()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`backend did not start on ${BASE}`);
}

export function stopServer(): void {
  try {
    if (!spawned) return;
    if (typeof spawned.kill === "function") spawned.kill("SIGTERM");
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
  const browser = await chromium.launch({
    args: envGet("CI") || envGet("GITHUB_ACTIONS") ? ["--no-sandbox", "--disable-dev-shm-usage"] : [],
  });
  const ctx = await browser.newContext({ viewport: opts.viewport ?? { width: 1280, height: 800 }, locale: opts.locale });
  await ctx.request.get(BASE + "/login");
  const csrf = (await ctx.cookies()).find((c) => c.name === "_csrf")?.value ?? "";
  // JSON login (not form-urlencoded): skips captcha unless a captcha cookie is already set.
  const r = await ctx.request.post(BASE + "/api/auth/login", {
    data: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    headers: { "x-csrf-token": csrf, "content-type": "application/json", accept: "application/json" },
    maxRedirects: 0,
  });
  const body = await r.json().catch(() => ({} as Record<string, unknown>));
  const st = String((body as any)?.status ?? "");
  if (r.status() !== 200 || st === "passkey" || st === "2fa" || (body as any)?.ok !== true) {
    throw new Error("browser login failed " + r.status() + " " + JSON.stringify(body));
  }
  const sid = (await ctx.cookies()).find((c) => c.name === "dweb_admin_sid" || c.name.startsWith("dweb_admin"));
  if (!sid?.value) throw new Error("browser login missing session cookie: " + JSON.stringify(await ctx.cookies()));
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

// ------------------------------------------------------------------ data helpers

export const rand = () => Math.random().toString(36).slice(2, 8);

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) from a base32 secret. */
export async function totpCode(secret: string, atMs = Date.now()): Promise<string> {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const counter = Math.floor(atMs / 1000 / 30);
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setUint32(4, counter);
  const key = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

export interface TestUser {
  id: string;
  username: string;
  password: string;
}

/** Create an admin user through the generic resource API (as admin) and return its credentials. */
export async function makeUser(admin: Api, roleCodes: string[] = [], extra: Record<string, unknown> = {}): Promise<TestUser> {
  const username = `t_${rand()}`;
  const password = "Passw0rd!x";
  const r = await admin.post("/api/res/create", {
    res: "admins",
    username,
    email: `${username}@example.com`,
    password,
    password2: password,
    roleCodes,
    status: "active",
    ...extra,
  });
  if (r.status !== 201) throw new Error(`makeUser failed ${r.status} ${JSON.stringify(r.data)}`);
  const list = await admin.get(`/api/res?res=admins&username=${username}`);
  const id = list.data.rows.find((x: any) => x.username === username)?.id;
  return { id, username, password };
}

export async function removeUser(admin: Api, u: TestUser | string): Promise<void> {
  await admin.post("/api/res/remove", { res: "admins", ids: [typeof u === "string" ? u : u.id] });
}
