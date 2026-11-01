/** Short-lived one-shot challenges (2FA login step, WebAuthn ceremonies). */
import { AdminChallenge, type AdminChallengeDocument, type ChallengeKind } from "@common/model/mod.ts";
import { randomToken, sha256 } from "@common/service/password.ts";

export const CHALLENGE_COOKIE = "dweb_admin_chal";
const TTL_SECONDS = 300;

export async function createChallenge(
  init: { kind: ChallengeKind; userId?: string; challenge?: string; remember?: boolean },
): Promise<string> {
  const token = randomToken();
  await AdminChallenge.deleteMany({ expiresAt: { $lt: new Date() } });
  await AdminChallenge.create({
    ...init,
    tokenHash: await sha256(token),
    expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
  });
  return token;
}

/** Read without consuming (e.g. to allow retrying a wrong TOTP code). */
export async function peekChallenge(token: string, kind: ChallengeKind): Promise<AdminChallengeDocument | null> {
  if (!token) return null;
  const row = await AdminChallenge.findOne({ tokenHash: await sha256(token) }) as AdminChallengeDocument | null;
  if (!row || row.kind !== kind || new Date(row.expiresAt).getTime() < Date.now()) return null;
  return row;
}

export async function consumeChallenge(token: string, kind: ChallengeKind): Promise<AdminChallengeDocument | null> {
  const row = await peekChallenge(token, kind);
  if (row) await AdminChallenge.deleteMany({ tokenHash: row.tokenHash });
  return row;
}

export function challengeCookie(token: string): string {
  return `${CHALLENGE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}

export function clearChallengeCookie(): string {
  return `${CHALLENGE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readChallengeToken(request: Request): string {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CHALLENGE_COOKIE) return rest.join("=");
  }
  return "";
}
