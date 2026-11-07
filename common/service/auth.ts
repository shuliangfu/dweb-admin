/**
 * Login / session. Cookie holds the raw token; DB stores only its SHA-256.
 */
import { getEnv, getEnvInt } from "@common/utils/env.ts";
import {
  AdminPasskey,
  AdminSession,
  type AdminSessionDocument,
  AdminUser,
  type AdminUserDocument,
} from "@common/model/mod.ts";
import { randomToken, sha256, verifyPassword } from "@common/service/password.ts";
import { hasSuperRole } from "@common/service/rbac.ts";

const COOKIE = getEnv("AUTH_COOKIE_NAME") || "dweb_admin_sid";

export interface AuthUser {
  id: string;
  username: string;
  nickname: string;
  roleCodes: string[];
  isSuper: boolean;
}

function maxAge(): number {
  return getEnvInt("AUTH_SESSION_MAX_AGE", 60 * 60 * 24);
}

function secureFlag(): string {
  return getEnv("ADMIN_COOKIE_SECURE") === "1" ? "; Secure" : "";
}

/** Session cookie value for Set-Cookie. */
export function createAuthCookie(token: string, seconds = maxAge()): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secureFlag()}`;
}

export function clearAuthCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`;
}

export function readToken(request: Request): string {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return "";
}

/** Resolve the logged-in user from the cookie; null when anonymous/expired. */
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const raw = readToken(request);
  if (!raw) return null;
  const session = await AdminSession.findOne({
    tokenHash: await sha256(raw),
  }) as AdminSessionDocument | null;
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const user = await AdminUser.findOne({ _id: session.userId }) as AdminUserDocument | null;
  if (!user || user.status !== "active") return null;
  const roleCodes = user.roleCodes ?? [];
  return {
    id: user._id!,
    username: user.username,
    nickname: user.nickname || user.username,
    roleCodes,
    isSuper: await hasSuperRole(roleCodes),
  };
}

/** Raw admin session cookie — for same-origin WS bootstrap only; never log. */
export function readAdminSessionToken(request: Request): string {
  return readToken(request);
}

/** Resolve admin from raw session token (WS `adminToken` query). */
export async function adminFromToken(raw: string): Promise<AuthUser | null> {
  if (!raw) return null;
  const session = await AdminSession.findOne({
    tokenHash: await sha256(raw),
  }) as AdminSessionDocument | null;
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const user = await AdminUser.findOne({ _id: session.userId }) as AdminUserDocument | null;
  if (!user || user.status !== "active") return null;
  const roleCodes = user.roleCodes ?? [];
  return {
    id: user._id!,
    username: user.username,
    nickname: user.nickname || user.username,
    roleCodes,
    isSuper: await hasSuperRole(roleCodes),
  };
}

/** Prefer adminFromToken; getCurrentUser keeps cookie path. */


// --- naive in-memory brute-force throttle (per username) ---
const fails = new Map<string, { count: number; reset: number }>();
const DUMMY_HASH = `pbkdf2$210000$${"0".repeat(32)}$${"0".repeat(64)}`;

function locked(name: string): boolean {
  const row = fails.get(name);
  return !!row && row.reset >= Date.now() && row.count >= 8;
}

function markFail(name: string): void {
  const now = Date.now();
  const row = fails.get(name);
  if (!row || row.reset < now) fails.set(name, { count: 1, reset: now + 10 * 60_000 });
  else row.count += 1;
}

/** "Remember me" lifetime: 30 days (cookie Max-Age and Mongo expiresAt). */
export const REMEMBER_SECONDS = 60 * 60 * 24 * 30;

export type LoginResult =
  | { status: "ok"; user: AuthUser; cookie: string; token: string }
  /** Password OK; fingerprint gate next (user has passkeyEnabled). */
  | { status: "passkey"; challengeToken: string }
  /** Password OK (or fingerprint gate done); TOTP code still required. */
  | { status: "2fa"; challengeToken: string };

function toAuthUser(doc: AdminUserDocument, isSuper: boolean): AuthUser {
  return {
    id: doc._id!,
    username: doc.username,
    nickname: doc.nickname || doc.username,
    roleCodes: doc.roleCodes ?? [],
    isSuper,
  };
}

export type SessionClientMeta = { ip?: string; userAgent?: string };

/** Best-effort client IP + UA from a Request (proxy-aware). */
export function clientMeta(request: Request): SessionClientMeta {
  const xf = request.headers.get("x-forwarded-for");
  const ipRaw = (xf?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "").trim();
  const ip = ipRaw ? ipRaw.slice(0, 128) : undefined;
  const ua = (request.headers.get("user-agent") || "").trim();
  const userAgent = ua ? ua.slice(0, 512) : undefined;
  return { ip, userAgent };
}

/** Create a session row + cookie for an already authenticated user. */
export async function startSession(
  doc: AdminUserDocument,
  remember: boolean,
  meta?: SessionClientMeta,
): Promise<{ user: AuthUser; cookie: string; token: string }> {
  const seconds = remember ? REMEMBER_SECONDS : maxAge();
  const token = randomToken();
  await AdminSession.create({
    userId: doc._id!,
    username: doc.username,
    tokenHash: await sha256(token),
    expiresAt: new Date(Date.now() + seconds * 1000),
    ...(meta?.ip ? { ip: meta.ip } : {}),
    ...(meta?.userAgent ? { userAgent: meta.userAgent } : {}),
  });
  await AdminUser.updateById(doc._id!, { lastLoginAt: new Date() });
  const user = toAuthUser(doc, await hasSuperRole(doc.roleCodes ?? []));
  return { user, cookie: createAuthCookie(token, seconds), token };
}

/**
 * Check credentials. Success → session (or a TOTP challenge when 2FA is on).
 * Failure reveals nothing (same null for unknown user / bad password / locked).
 */
export async function login(
  username: string,
  password: string,
  remember = false,
  meta?: SessionClientMeta,
): Promise<LoginResult | null> {
  const name = username.trim();
  if (!name || !password || locked(name)) return null;
  const doc = await AdminUser.findOne({ username: name }) as AdminUserDocument | null;
  // Always verify against a hash so timing doesn't leak whether the user exists.
  const ok = await verifyPassword(password, doc?.password || DUMMY_HASH);
  if (!doc || doc.status !== "active" || !ok) {
    markFail(name);
    return null;
  }
  fails.delete(name);
  const { createChallenge } = await import("@common/service/challenge.ts");
  // Gate order after password: fingerprint (if on) → two-step (if on) → enter.
  if (doc.passkeyEnabled) {
    const keyCount = await AdminPasskey.count({ userId: doc._id! });
    if (keyCount > 0) {
      return {
        status: "passkey",
        challengeToken: await createChallenge({ kind: "passkey-gate", userId: doc._id!, remember }),
      };
    }
  }
  if (doc.totpEnabled && doc.totpSecret) {
    return {
      status: "2fa",
      challengeToken: await createChallenge({ kind: "2fa", userId: doc._id!, remember }),
    };
  }
  return { status: "ok", ...(await startSession(doc, remember, meta)) };
}

export type RevokeResult = { ok: true } | { ok: false; error: "notFound" | "cannotKickSelf" };

/**
 * Force-expire another admin session by id (online list kick).
 * Refuses to revoke the caller's own current cookie session.
 */
export async function revokeSessionById(
  sessionId: string,
  request: Request,
): Promise<RevokeResult> {
  const id = sessionId.trim();
  if (!id) return { ok: false, error: "notFound" };
  const row = await AdminSession.findById(id) as AdminSessionDocument | null;
  if (!row) return { ok: false, error: "notFound" };
  const raw = readToken(request);
  if (raw && row.tokenHash === await sha256(raw)) {
    return { ok: false, error: "cannotKickSelf" };
  }
  await AdminSession.deleteById(id);
  return { ok: true };
}

/** Delete the server-side session for this request. */
export async function logout(request: Request): Promise<void> {
  const raw = readToken(request);
  if (!raw) return;
  await AdminSession.deleteMany({ tokenHash: await sha256(raw) });
}

/**
 * Verify the current session user's password (screen unlock). Does not rotate the session.
 * Returns false when unauthenticated or the password is wrong.
 */
export async function unlock(request: Request, password: string): Promise<boolean> {
  const sessionUser = await getCurrentUser(request);
  if (!sessionUser || !password) return false;
  const doc = await AdminUser.findOne({ username: sessionUser.username }) as AdminUserDocument | null;
  if (!doc || doc.status !== "active") return false;
  return await verifyPassword(password, doc.password || DUMMY_HASH);
}

