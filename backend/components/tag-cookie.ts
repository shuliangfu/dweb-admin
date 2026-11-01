/**
 * Visited-tab list stored in a cookie so the SERVER can render the exact same tab strip the client
 * will render (no SSR→hydration flash). Pure helpers, safe on both sides.
 */
export interface TagEntry {
  path: string;
  title: string;
  fixed?: boolean;
}

export const TAGS_COOKIE = "dweb-admin-tags";
const MAX_TAGS = 15;
const MAX_TITLE = 16;

function home(dashTitle: string): TagEntry {
  return { path: "/", title: dashTitle, fixed: true };
}

export function ensureHome(list: TagEntry[], dashTitle: string): TagEntry[] {
  const rest = list.filter((t) => t.path !== "/");
  return [home(dashTitle), ...rest];
}

/** Parse the raw cookie VALUE (URL-encoded JSON). Never throws. */
export function parseTagsValue(raw: string | null | undefined, dashTitle: string): TagEntry[] {
  if (!raw) return [home(dashTitle)];
  try {
    const arr = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!Array.isArray(arr)) return [home(dashTitle)];
    const list = arr
      .filter((t): t is { p: string; t: string } => !!t && typeof t.p === "string" && typeof t.t === "string" && t.p.startsWith("/"))
      .map((t) => ({ path: t.p, title: t.t }));
    return ensureHome(list, dashTitle);
  } catch {
    return [home(dashTitle)];
  }
}

/** Pull the tags cookie value out of a Cookie header / document.cookie string. */
export function tagsValueFromCookie(cookieHeader: string | null | undefined): string | null {
  const m = (cookieHeader ?? "").match(new RegExp(`(?:^|;\\s*)${TAGS_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

export function serializeTags(list: TagEntry[]): string {
  const slim = list
    .filter((t) => !t.fixed)
    .slice(-MAX_TAGS)
    .map((t) => ({ p: t.path, t: t.title.slice(0, MAX_TITLE) }));
  return encodeURIComponent(JSON.stringify(slim));
}

/** Add/refresh one tab (pure). */
export function withTag(list: TagEntry[], path: string, title: string, dashTitle: string): TagEntry[] {
  let next = ensureHome(list, dashTitle);
  const i = next.findIndex((t) => t.path === path);
  if (i === -1) return [...next, { path, title: (title || path).slice(0, MAX_TITLE) }].slice(-(MAX_TAGS + 1));
  if (title && !next[i].fixed && next[i].title !== title.slice(0, MAX_TITLE)) {
    next = next.slice();
    next[i] = { ...next[i], title: title.slice(0, MAX_TITLE) };
  }
  return next;
}
