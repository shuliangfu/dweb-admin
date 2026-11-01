/**
 * i18n (zh-CN + en-US) built on @dreamer/i18n.
 *
 * One I18n instance per locale so concurrent SSR requests never share a
 * mutable "current locale". Locale is chosen per request from the `locale`
 * cookie, then Accept-Language, then the default (zh-CN).
 */
import { createI18n, type I18n, type TranslationData } from "@dreamer/i18n";
import zhCN from "./zh-CN.ts";
import enUS from "./en-US.ts";

export const LOCALES = ["zh-CN", "en-US"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh-CN";
export const LOCALE_COOKIE = "locale";

/** Human readable language names (shown in the language switch). */
export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "en-US": "English",
};

const dictionaries: Record<Locale, TranslationData> = {
  "zh-CN": zhCN as unknown as TranslationData,
  "en-US": enUS as unknown as TranslationData,
};

const instances = new Map<Locale, I18n>();

function instanceOf(locale: Locale): I18n {
  let inst = instances.get(locale);
  if (!inst) {
    inst = createI18n({
      defaultLocale: locale,
      locales: [locale],
      translations: { [locale]: dictionaries[locale] },
      fallbackBehavior: "key",
    });
    inst.setLocale(locale);
    instances.set(locale, inst);
  }
  return inst;
}

/** True when `value` is a supported locale code. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" &&
    (LOCALES as readonly string[]).includes(value);
}

/** Map loose input ("zh", "en-GB", "zh_CN") to a supported locale. */
export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const v = value.trim().replace("_", "-").toLowerCase();
  if (v.startsWith("zh")) return "zh-CN";
  if (v.startsWith("en")) return "en-US";
  return null;
}

/** Translate `key` for `locale` ({name} style params supported). */
export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number | boolean>,
): string {
  return instanceOf(locale).t(key, params);
}

/** Bind a translate function to a locale. */
export function createT(locale: Locale) {
  return (key: string, params?: Record<string, string | number | boolean>) =>
    t(locale, key, params);
}

/** Pick the localized text from a `{ "zh-CN": "...", "en-US": "..." }` record. */
export function pickLocalized(
  record: Record<string, string> | undefined,
  locale: Locale,
  fallback = "",
): string {
  if (!record) return fallback;
  return record[locale] ?? record[DEFAULT_LOCALE] ?? Object.values(record)[0] ??
    fallback;
}

/** Resolve the request locale: cookie → Accept-Language → default. */
export function resolveLocale(request: Request): Locale {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === LOCALE_COOKIE) {
      const l = normalizeLocale(decodeURIComponent(rest.join("=")));
      if (l) return l;
    }
  }
  const accept = request.headers.get("accept-language") ?? "";
  for (const item of accept.split(",")) {
    const l = normalizeLocale(item.split(";")[0]);
    if (l) return l;
  }
  return DEFAULT_LOCALE;
}

/** Set-Cookie value that persists the chosen locale for one year. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; SameSite=Lax; Max-Age=31536000`;
}
