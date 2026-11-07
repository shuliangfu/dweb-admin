/**
 * Guest contact gate helpers (phone OR email).
 * Pure — safe for browser WebChat (no Mongo / service imports).
 */

/** Placeholder for legacy sessions that never collected contact. */
export const CS_GUEST_NAME_FALLBACK = "（无联系方式）";

/** Trim + strip interior spaces for phone/email contact. */
export function normalizeGuestContact(raw: string): string {
  return String(raw ?? "").trim().replace(/\s+/g, "");
}

/**
 * Canonical stored contact: normalize + lowercase emails.
 * Phones keep digit form after normalize (no forced digit-only store).
 */
export function canonicalGuestContact(raw: string): string {
  const s = normalizeGuestContact(raw).slice(0, 80);
  if (s.includes("@")) return s.toLowerCase();
  return s;
}

/**
 * Guest contact gate: phone OR email (reasonable formats).
 * New sessions must pass; legacy rows may still carry old 「访客」 names.
 */
export function isValidGuestContact(raw: string): boolean {
  const s = normalizeGuestContact(raw);
  if (!s || s.length > 80) return false;
  if (s.includes("@")) {
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s);
  }
  // Phone: optional +, digits / dashes / parens; 7–15 digits total.
  const compact = s.replace(/[-()]/g, "");
  if (/^\+?[0-9]{7,15}$/.test(compact)) return true;
  return false;
}

/**
 * Dedup / lookup key for a guest contact.
 * Email → lowercased; phone → compact digits (optional leading +).
 * Empty string = not a valid contact (do not merge).
 */
export function guestContactKey(raw: string): string {
  const s = normalizeGuestContact(raw);
  if (!isValidGuestContact(s)) return "";
  if (s.includes("@")) return s.toLowerCase();
  return s.replace(/[-()]/g, "");
}

/** List / detail display name — never show bare 「访客」 for new product copy. */
export function displayGuestName(name: string | undefined | null): string {
  const s = String(name ?? "").trim();
  if (!s || s === "访客") return CS_GUEST_NAME_FALLBACK;
  return s;
}
