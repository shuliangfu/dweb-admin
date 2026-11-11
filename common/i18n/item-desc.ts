/**
 * Locale-resolved descriptions for seeded RBAC roles / permissions.
 *
 * Seed rows store English text in the database and are never overwritten.
 * The list, detail, and assign UIs pick a translation by item name when the
 * stored text is still the canonical seed (or empty). Custom descriptions
 * entered by an admin are left untouched.
 */
import { t, type Locale } from "./mod.ts";

/** Built-in item names from `common/service/seed.ts` (keep in sync). */
export const SEEDED_ITEM_NAMES = [
  "super_admin",
  "operator",
  "cs_agent",
  "admin.view",
  "admin.write",
  "rbac.view",
  "rbac.write",
  "system.view",
  "system.write",
  "user.view",
  "user.write",
  "cms.view",
  "cms.write",
  "developer.view",
  "developer.write",
  "cs.view",
  "cs.claim",
  "cs.reply",
  "cs.upload",
  "cs.hide",
  "cs.remove",
] as const;

export type SeededItemName = (typeof SEEDED_ITEM_NAMES)[number];

const SEEDED = new Set<string>(SEEDED_ITEM_NAMES);

export function isSeededItemName(name: string): name is SeededItemName {
  return SEEDED.has(name);
}

export function itemDescKey(name: string): string {
  return `rbac.itemDesc.${name}`;
}

/**
 * Description shown in the current locale.
 * Seeded item names always use i18n (DB may still hold older English seed
 * wording; we do not overwrite those rows). Unknown names keep `stored`.
 */
export function itemDescription(name: string, stored: string, locale: Locale): string {
  if (!isSeededItemName(name)) return stored;
  const key = itemDescKey(name);
  const localized = t(locale, key);
  if (!localized || localized === key) return stored;
  return localized;
}

/** Seeded item names whose localized (or canonical) description matches `query`. */
export function namesMatchingItemDesc(query: string, locale: Locale): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SEEDED_ITEM_NAMES.filter((name) => {
    const shown = itemDescription(name, t("en-US", itemDescKey(name)), locale);
    return shown.toLowerCase().includes(q);
  });
}
