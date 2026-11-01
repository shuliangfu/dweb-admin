/**
 * Image captcha for login / forget-password.
 *
 * Picture comes from `@dreamer/humancheck` (SVG). The answer is not stored in
 * MemoryStore — that store is process-local and would not survive another
 * instance. The code is sealed in an HttpOnly HMAC cookie instead.
 */
import { createImageChallenge } from "@dreamer/humancheck";
import { getEnv } from "@common/utils/env.ts";

export const CAPTCHA_COOKIE = "dweb_admin_captcha";
const TTL_MS = 5 * 60_000;
/** Vue `.captcha img` is 150×30; 40px keeps rotated glyphs inside the box. */
const WIDTH = 150;
const HEIGHT = 40;

const imageChallenge = createImageChallenge({
  length: 4,
  width: WIDTH,
  height: HEIGHT,
  noiseLines: 4,
  noiseDots: 24,
  noiseArcs: 2,
  backgroundColor: "#f1f5f9",
  caseSensitive: false,
});

function secret(): string {
  return getEnv("CAPTCHA_SECRET") || getEnv("AUTH_CAPTCHA_SECRET") ||
    "dweb-admin-captcha-dev";
}

function secureFlag(): string {
  return getEnv("ADMIN_COOKIE_SECURE") === "1" ? "; Secure" : "";
}

function b64url(bytes: Uint8Array): string {
  const s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** humancheck returns a data URL; `<img src>` wants raw SVG. */
function svgFromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Issue captcha: SVG markup + Set-Cookie. `code` is for tests only — never send it to the client. */
export async function issueCaptcha(): Promise<
  { svg: string; setCookie: string; code: string }
> {
  const { data, answer } = imageChallenge.generate();
  const code = answer.toUpperCase();
  const exp = Date.now() + TTL_MS;
  const dig = await hmacHex(`${code}.${exp}`);
  const token = b64url(new TextEncoder().encode(`${exp}.${dig}`));
  const setCookie =
    `${CAPTCHA_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      Math.floor(TTL_MS / 1000)
    }${secureFlag()}`;
  return { svg: svgFromDataUrl(data.image), setCookie, code };
}

export function clearCaptchaCookie(): string {
  return `${CAPTCHA_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`;
}

function readCaptchaToken(req: Request): string {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CAPTCHA_COOKIE) return rest.join("=");
  }
  return "";
}

/** Verify user input against the captcha cookie. Caller clears the cookie. */
export async function verifyCaptcha(
  req: Request,
  input: string,
): Promise<boolean> {
  const raw = (input ?? "").trim().toUpperCase();
  if (!raw || raw.length > 8) return false;
  const token = readCaptchaToken(req);
  if (!token) return false;
  let payload: string;
  try {
    payload = new TextDecoder().decode(fromB64url(token));
  } catch {
    return false;
  }
  const dot = payload.indexOf(".");
  if (dot < 0) return false;
  const exp = Number(payload.slice(0, dot));
  const dig = payload.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expect = await hmacHex(`${raw}.${exp}`);
  if (expect.length !== dig.length) return false;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) {
    diff |= expect.charCodeAt(i) ^ dig.charCodeAt(i);
  }
  return diff === 0;
}
