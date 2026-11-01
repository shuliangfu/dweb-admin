/** Screen-lock cookie (UI gate). Session cookie stays valid. */
export const LOCK_COOKIE = "dweb-admin-locked";

export function lockCookie(on: boolean): string {
  return on
    ? `${LOCK_COOKIE}=1; Path=/; Max-Age=86400; SameSite=Lax`
    : `${LOCK_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function isLockedRequest(cookieHeader: string | null | undefined): boolean {
  return /(?:^|;\s*)dweb-admin-locked=1/.test(cookieHeader ?? "");
}

/** Client helper: set lock cookie then go to /lock. */
export function lockNow(): void {
  const doc = (globalThis as { document?: { cookie: string }; location?: { href: string } });
  if (!doc.document || !doc.location) return;
  doc.document.cookie = `${LOCK_COOKIE}=1; Path=/; Max-Age=86400; SameSite=Lax`;
  doc.location.href = "/lock";
}

export function clearLockCookieClient(): void {
  const doc = (globalThis as { document?: { cookie: string } }).document;
  if (!doc) return;
  doc.cookie = `${LOCK_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
