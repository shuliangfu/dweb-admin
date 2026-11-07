/**
 * Pure lobby list helpers — online-first sort + contact dedupe.
 * Safe for browser WebChat (no Mongo / service imports).
 */
import {
  guestContactKey,
  isValidGuestContact,
} from "@common/utils/cs-contact.ts";

/** Minimal shape shared by CsSessionRow / WebChat SessionRow. */
export interface CsLobbyListRow {
  id: string;
  guestName: string;
  updatedAt?: string;
  online?: boolean;
  lastPreview?: string;
  claimedByAdminId?: string | null;
}

/**
 * Sort: all online first, then offline; within band by updatedAt desc.
 * (Fixes regression where lastMsg-primary buried green avatars under gray.)
 */
export function compareCsLobbyRows(
  a: CsLobbyListRow,
  b: CsLobbyListRow,
): number {
  const oa = a.online === true ? 1 : 0;
  const ob = b.online === true ? 1 : 0;
  if (oa !== ob) return ob - oa;
  const ta = Date.parse(a.updatedAt || "") || 0;
  const tb = Date.parse(b.updatedAt || "") || 0;
  return tb - ta;
}

export function sortCsLobbyRows<T extends CsLobbyListRow>(rows: T[]): T[] {
  return rows.slice().sort(compareCsLobbyRows);
}

/**
 * Pick the canonical row for one contact key.
 * Prefer: online → has preview → claimed → newer updatedAt → stable id.
 */
export function pickCanonicalCsLobbyRow<T extends CsLobbyListRow>(
  rows: T[],
): T {
  if (rows.length === 1) return rows[0]!;
  return rows.slice().sort((a, b) => {
    const oa = a.online === true ? 1 : 0;
    const ob = b.online === true ? 1 : 0;
    if (oa !== ob) return ob - oa;
    const pa = (a.lastPreview || "").trim() ? 1 : 0;
    const pb = (b.lastPreview || "").trim() ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ca = a.claimedByAdminId && String(a.claimedByAdminId).trim() ? 1 : 0;
    const cb = b.claimedByAdminId && String(b.claimedByAdminId).trim() ? 1 : 0;
    if (ca !== cb) return cb - ca;
    const ta = Date.parse(a.updatedAt || "") || 0;
    const tb = Date.parse(b.updatedAt || "") || 0;
    if (ta !== tb) return tb - ta;
    return String(a.id).localeCompare(String(b.id));
  })[0]!;
}

/**
 * One contact → one lobby row. Invalid / empty contacts are never merged together.
 * Does not delete DB rows — list display only.
 */
export function dedupeCsLobbyRowsByContact<T extends CsLobbyListRow>(
  rows: T[],
): T[] {
  const groups = new Map<string, T[]>();
  const passthrough: T[] = [];
  for (const row of rows) {
    if (!row?.id) continue;
    if (!isValidGuestContact(row.guestName)) {
      passthrough.push(row);
      continue;
    }
    const key = guestContactKey(row.guestName);
    if (!key) {
      passthrough.push(row);
      continue;
    }
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  const out: T[] = [...passthrough];
  for (const bucket of groups.values()) {
    out.push(pickCanonicalCsLobbyRow(bucket));
  }
  return sortCsLobbyRows(out);
}
