/**
 * Password hashing: PBKDF2-HMAC-SHA256 (WebCrypto), per-password random salt.
 * Format: pbkdf2$<iterations>$<salt>$<hash-hex>. Plain text is never stored.
 */

const ITERATIONS = 210_000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Random lowercase hex string of `bytes` bytes of entropy. */
export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function derive(
  password: string,
  salt: string,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return toHex(bits);
}

/** Hash a password for storage. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16);
  return `pbkdf2$${ITERATIONS}$${salt}$${await derive(password, salt, ITERATIONS)}`;
}

/** Constant-time comparison. */
function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Verify a password against a stored hash. Malformed hashes fail. */
export async function verifyPassword(
  password: string,
  saved: string,
): Promise<boolean> {
  const [scheme, iterText, salt, hash] = saved.split("$");
  if (scheme !== "pbkdf2" || !iterText || !salt || !hash) return false;
  const iterations = Number.parseInt(iterText, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  return safeEqual(await derive(password, salt, iterations), hash);
}

/** SHA-256 hex, used to store session tokens instead of the raw value. */
export async function sha256(text: string): Promise<string> {
  return toHex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
  );
}

/** Random session token. */
export function randomToken(bytes = 32): string {
  return randomHex(bytes);
}
