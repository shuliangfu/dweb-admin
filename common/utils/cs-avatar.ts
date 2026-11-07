/**
 * Stable guest avatars for admin session list (WeChat-style rounded square).
 * Seed = sessionId (visitor identity while client LS persists the same session).
 * Online = full color; offline = CSS grayscale(1) at call site.
 */

/** Distinct solid fills — hash(sessionId) picks one; same id → same color forever. */
const AVATAR_PALETTE = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#F43F5E",
  "#0EA5E9",
] as const;

/** FNV-1a 32-bit — sync, no crypto dependency (browser + Deno). */
export function hashGuestSeed(seed: string): number {
  let h = 2166136261;
  const s = String(seed ?? "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Initials: email → local first letter; phone → last 2 digits; else first 1–2 chars. */
export function guestAvatarLabel(name: string): string {
  const s = String(name ?? "").trim();
  if (!s || s.startsWith("（")) return "?";
  if (s.includes("@")) {
    const local = s.split("@")[0] || "?";
    return local.slice(0, 1).toUpperCase();
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 2) return digits.slice(-2);
  return Array.from(s).slice(0, 2).join("").toUpperCase();
}

export function guestAvatarBg(seed: string): string {
  const h = hashGuestSeed(seed || "guest");
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
}

export interface GuestAvatarMeta {
  bg: string;
  label: string;
}

/** Stable meta for one visitor/session row. */
export function guestAvatarMeta(sessionId: string, guestName: string): GuestAvatarMeta {
  return {
    bg: guestAvatarBg(sessionId),
    label: guestAvatarLabel(guestName),
  };
}
