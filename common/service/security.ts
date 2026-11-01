/**
 * Account security: change password, Google Authenticator (TOTP) and passkeys (WebAuthn).
 *
 * Reuse: TOTP (secret / QR / verify) = @dreamer/humancheck createTotp;
 *        WebAuthn ceremonies = npm:@simplewebauthn/server (no WebAuthn code exists in dreamer-jsr).
 */
import { object, string } from "@dreamer/utils/validator";
import { createTotp } from "@dreamer/humancheck";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  AdminPasskey,
  type AdminPasskeyDocument,
  AdminSession,
  AdminUser,
  type AdminUserDocument,
} from "@common/model/mod.ts";
import { hashPassword, sha256, verifyPassword } from "@common/service/password.ts";
import { startSession } from "@common/service/auth.ts";
import { consumeChallenge, createChallenge, peekChallenge } from "@common/service/challenge.ts";
import { getEnv } from "@common/utils/env.ts";
import { parseBody } from "@common/utils/validate.ts";
import type { Fail, Ok } from "@common/service/admin-crud.ts";

const ISSUER = "Dweb Admin";
const totp = createTotp({ issuer: ISSUER, digits: 6, period: 30, window: 1 });

async function userById(id: string): Promise<AdminUserDocument | null> {
  return await AdminUser.findOne({ _id: id }) as AdminUserDocument | null;
}

// ------------------------------------------------------------------ overview

export async function securityOverview(userId: string) {
  const user = await userById(userId);
  if (!user) return null;
  const keys = (await AdminPasskey.findAll({ userId }, undefined, { sort: { createdAt: 1 } })) as unknown as AdminPasskeyDocument[];
  return {
    totpEnabled: !!user.totpEnabled,
    passkeyEnabled: !!user.passkeyEnabled,
    passkeys: keys.map((k) => ({
      id: String(k._id),
      name: k.name,
      createdAt: k.createdAt ? new Date(k.createdAt).toISOString() : "",
      lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : "",
    })),
  };
}

// ------------------------------------------------------------------ password

/** Verify the old password, store the new hash, drop every other session of this user. */
export async function changePassword(
  userId: string,
  currentToken: string,
  body: unknown,
): Promise<Ok | Fail> {
  const parsed = parseBody(
    body,
    object({
      oldPassword: string().required().max(64),
      newPassword: string().required().min(6).max(64),
    }),
  );
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const { oldPassword, newPassword } = parsed.data as { oldPassword: string; newPassword: string };
  const user = await userById(userId);
  if (!user) return { ok: false, error: "notFound" };
  if (!await verifyPassword(oldPassword, user.password)) {
    return { ok: false, error: "wrongPassword", fields: ["oldPassword"] };
  }
  if (oldPassword === newPassword) return { ok: false, error: "samePassword", fields: ["newPassword"] };
  await AdminUser.updateById(userId, { password: await hashPassword(newPassword) });
  const keep = currentToken ? await sha256(currentToken) : "";
  const sessions = (await AdminSession.findAll({ userId })) as unknown as { _id: string; tokenHash: string }[];
  for (const s of sessions) if (s.tokenHash !== keep) await AdminSession.deleteById(String(s._id));
  return { ok: true };
}

// ---------------------------------------------------------------------- TOTP

/** Start setup: returns a fresh secret + QR (SVG data URL). Not active until a code is verified. */
export async function totpBegin(userId: string): Promise<Fail | Ok<{ secret: string; qrCode: string; otpauthUrl: string }>> {
  const user = await userById(userId);
  if (!user) return { ok: false, error: "notFound" };
  if (user.totpEnabled) return { ok: false, error: "totpAlready" };
  const r = totp.generateSecret(user.username);
  await AdminUser.updateById(userId, { totpPendingSecret: r.secret });
  return { ok: true, secret: r.secret, qrCode: r.qrCode, otpauthUrl: r.otpauthUrl };
}

async function codeValid(secret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code.trim())) return false;
  try {
    const r = await totp.verify(secret, code.trim());
    return !!(r as { success?: boolean }).success;
  } catch {
    return false;
  }
}

export async function totpEnable(userId: string, code: string): Promise<Ok | Fail> {
  const user = await userById(userId);
  if (!user) return { ok: false, error: "notFound" };
  if (user.totpEnabled) return { ok: false, error: "totpAlready" };
  if (!user.totpPendingSecret) return { ok: false, error: "totpNotStarted" };
  if (!await codeValid(user.totpPendingSecret, code)) return { ok: false, error: "totpWrong", fields: ["code"] };
  await AdminUser.updateById(userId, { totpSecret: user.totpPendingSecret, totpPendingSecret: "", totpEnabled: true });
  return { ok: true };
}

/** Disabling needs a valid current code. */
export async function totpDisable(userId: string, code: string): Promise<Ok | Fail> {
  const user = await userById(userId);
  if (!user) return { ok: false, error: "notFound" };
  if (!user.totpEnabled || !user.totpSecret) return { ok: false, error: "totpNotEnabled" };
  if (!await codeValid(user.totpSecret, code)) return { ok: false, error: "totpWrong", fields: ["code"] };
  await AdminUser.updateById(userId, { totpSecret: "", totpPendingSecret: "", totpEnabled: false });
  return { ok: true };
}

const totpFails = new Map<string, { count: number; reset: number }>();

/** Login step 2: verify the TOTP code against the challenge, then open the session. */
export async function completeTwoFactor(challengeToken: string, code: string) {
  const ch = await peekChallenge(challengeToken, "2fa");
  if (!ch?.userId) return null;
  const uid = String(ch.userId);
  const now = Date.now();
  const row = totpFails.get(uid);
  if (row && row.reset >= now && row.count >= 5) return null;
  const user = await userById(uid);
  if (!user || user.status !== "active" || !user.totpSecret || !await codeValid(user.totpSecret, code)) {
    if (!row || row.reset < now) totpFails.set(uid, { count: 1, reset: now + 10 * 60_000 });
    else row.count += 1;
    return null;
  }
  totpFails.delete(uid);
  await consumeChallenge(challengeToken, "2fa");
  return await startSession(user, !!ch.remember);
}

// ------------------------------------------------------------------- passkeys

/** rpID / origin default to the request host; override with WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN behind proxies. */
function rp(request: Request) {
  const url = new URL(request.url);
  return {
    rpID: getEnv("WEBAUTHN_RP_ID") || url.hostname,
    origin: getEnv("WEBAUTHN_ORIGIN") || url.origin,
  };
}

const b64u = {
  fromBytes: (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  toBytes: (s: string) => {
    const p = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
    return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
  },
};

/** Registration step 1. Returns options + the challenge token (caller sets it as a cookie). */
export async function passkeyRegisterOptions(userId: string, request: Request) {
  const user = await userById(userId);
  if (!user) return null;
  const existing = (await AdminPasskey.findAll({ userId })) as unknown as AdminPasskeyDocument[];
  const { rpID } = rp(request);
  const options = await generateRegistrationOptions({
    rpName: ISSUER,
    rpID,
    userName: user.username,
    userDisplayName: user.nickname || user.username,
    userID: new TextEncoder().encode(String(user._id)),
    attestationType: "none",
    excludeCredentials: existing.map((k) => ({
      id: k.credentialId,
      transports: k.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  const token = await createChallenge({ kind: "passkey-reg", userId, challenge: options.challenge });
  return { options, token };
}

/** Registration step 2. */
export async function passkeyRegisterVerify(
  userId: string,
  request: Request,
  challengeToken: string,
  response: RegistrationResponseJSON,
  name: string,
): Promise<Ok | Fail> {
  const ch = await consumeChallenge(challengeToken, "passkey-reg");
  if (!ch || String(ch.userId) !== String(userId) || !ch.challenge) return { ok: false, error: "challengeExpired" };
  const { rpID, origin } = rp(request);
  try {
    const v = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
      if (!v.verified || !v.registrationInfo) return { ok: false, error: "passkeyFailed" };
    const c = v.registrationInfo.credential;
    await AdminPasskey.create({
      userId,
      credentialId: c.id,
      publicKey: b64u.fromBytes(c.publicKey),
      counter: c.counter,
      transports: response.response.transports ?? [],
      name: (name || "").trim().slice(0, 40) || "Passkey",
    });
    // First enrolled credential switches fingerprint login on.
    await AdminUser.updateById(userId, { passkeyEnabled: true });
    invalidateLoginFeatures();
    return { ok: true };
  } catch (e) {
    console.error("[passkey] registration verify failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "passkeyFailed" };
  }
}

// -------------------------------------------------------------------- profile

export interface Profile {
  username: string;
  nickname: string;
  email: string;
  roleCodes: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getProfile(userId: string): Promise<Profile | null> {
  const u = await userById(userId);
  if (!u) return null;
  return { username: u.username, nickname: u.nickname || u.username, email: u.email ?? "", roleCodes: u.roleCodes ?? [] };
}

/**
 * Edit OWN profile. The target is always the session user (id passed by the route from the
 * session, never from the body); only nickname / email are read, so roleCodes, status,
 * username, password etc. in the body are ignored.
 */
export async function updateProfile(userId: string, body: unknown): Promise<Ok | Fail> {
  const parsed = parseBody(body, object({ nickname: string().max(64).optional(), email: string().max(256).optional() }));
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const d = parsed.data as { nickname?: string; email?: string };
  const user = await userById(userId);
  if (!user) return { ok: false, error: "notFound" };
  const fields: string[] = [];
  const patch: Record<string, unknown> = {};
  if (d.nickname !== undefined) {
    const n = d.nickname.trim();
    if (n.length < 1 || n.length > 32) fields.push("nickname");
    else patch.nickname = n;
  }
  if (d.email !== undefined) {
    const e = d.email.trim();
    if (e && (e.length > 128 || !EMAIL_RE.test(e))) fields.push("email");
    else patch.email = e;
  }
  if (fields.length) return { ok: false, error: "invalid", fields };
  if (Object.keys(patch).length) await AdminUser.updateById(userId, patch);
  return { ok: true };
}

// ------------------------------------------------- login page feature switches

/**
 * Which optional sign-in methods the login page may show. GLOBAL, never per username:
 * the answer is identical for every visitor, so it cannot be used to probe accounts.
 *   - passkey: at least one active account has fingerprint login enabled
 *     (discoverable credentials, so no username is needed to start it).
 * TOTP is not listed on purpose: the code prompt only appears after the password was
 * accepted for an account that has it on (two-step login), which reveals nothing earlier.
 */
let featuresMemo: { at: number; value: { passkey: boolean } } | null = null;

export function invalidateLoginFeatures(): void {
  featuresMemo = null;
}

export async function loginFeatures(): Promise<{ passkey: boolean }> {
  if (featuresMemo && Date.now() - featuresMemo.at < 5_000) return featuresMemo.value;
  const passkey = (await AdminUser.count({ status: "active", passkeyEnabled: true })) > 0;
  featuresMemo = { at: Date.now(), value: { passkey } };
  return featuresMemo.value;
}

export async function passkeyRemove(userId: string, id: string): Promise<Ok | Fail> {
  const key = await AdminPasskey.findOne({ _id: id, userId }) as AdminPasskeyDocument | null;
  if (!key) return { ok: false, error: "notFound" };
  await AdminPasskey.deleteById(String(key._id));
  const left = await AdminPasskey.count({ userId });
  if (!left) await AdminUser.updateById(userId, { passkeyEnabled: false });
  invalidateLoginFeatures();
  return { ok: true };
}

export async function passkeySetEnabled(userId: string, enabled: boolean): Promise<Ok | Fail> {
  if (enabled && !await AdminPasskey.count({ userId })) return { ok: false, error: "noPasskey" };
  await AdminUser.updateById(userId, { passkeyEnabled: enabled });
  invalidateLoginFeatures();
  return { ok: true };
}

/** Login step 1 (public): discoverable-credential options. */
export async function passkeyLoginOptions(request: Request) {
  const { rpID } = rp(request);
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  const token = await createChallenge({ kind: "passkey-login", challenge: options.challenge });
  return { options, token };
}

/** Login step 2 (public). The passkey itself is two factors (possession + biometric/PIN), so TOTP is not asked again. */
export async function passkeyLoginVerify(
  request: Request,
  challengeToken: string,
  response: AuthenticationResponseJSON,
  remember: boolean,
) {
  const ch = await consumeChallenge(challengeToken, "passkey-login");
  if (!ch?.challenge) return null;
  const key = await AdminPasskey.findOne({ credentialId: response.id }) as AdminPasskeyDocument | null;
  if (!key) return null;
  const user = await userById(String(key.userId));
  if (!user || user.status !== "active" || !user.passkeyEnabled) return null;
  const { rpID, origin } = rp(request);
  try {
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: key.credentialId,
        publicKey: b64u.toBytes(key.publicKey),
        counter: key.counter,
        transports: key.transports as AuthenticatorTransportFuture[] | undefined,
      },
    });
    if (!v.verified) return null;
    await AdminPasskey.updateById(String(key._id), {
      counter: v.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    });
    return await startSession(user, remember);
  } catch (e) {
    console.error("[passkey] login verify failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
