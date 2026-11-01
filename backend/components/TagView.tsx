/**
 * Visited-page tabs — Vue Layout/TagView (+ TagItem close / context actions).
 * Tags live in a module signal + localStorage so they survive layout re-renders.
 * Context menu uses native contextmenu (Vue uses el-dropdown trigger=contextmenu).
 */
import { createSignal, onCleanup, onMount } from "@dreamer/view";
import { IconClose, Link } from "@dreamer/ui-view";
import { parseTagsValue, serializeTags, TAGS_COOKIE, type TagEntry, tagsValueFromCookie, withTag } from "@backend/components/tag-cookie.ts";

export type { TagEntry };

interface CtxMenu {
  x: number;
  y: number;
  path: string;
}

const tags = createSignal<TagEntry[]>([]);
const ctx = createSignal<CtxMenu | null>(null);
let storageReady = false;

type Doc = { cookie: string };
const doc = (): Doc | undefined => (globalThis as unknown as { document?: Doc }).document;
/** dweb SSR may expose a fake `document`, so detect the server by the Deno runtime instead. */
const isServer = (): boolean => "Deno" in globalThis;

function persist(list: TagEntry[]): void {
  const d = doc();
  if (!d || isServer()) return;
  d.cookie = `${TAGS_COOKIE}=${serializeTags(list)};path=/;max-age=31536000;SameSite=Lax`;
}

/** Client only: load from the cookie the server also rendered from (once per page lifetime). */
function hydrate(dashTitle: string): void {
  if (storageReady || isServer()) return;
  storageReady = true;
  tags.value = parseTagsValue(tagsValueFromCookie(doc()!.cookie), dashTitle);
}

function upsert(path: string, title: string, dashTitle: string): void {
  hydrate(dashTitle);
  const list = withTag(tags.value, path, title, dashTitle);
  if (JSON.stringify(list) !== JSON.stringify(tags.value)) {
    tags.value = list;
    persist(list);
  }
}

function go(path: string): void {
  const loc = (globalThis as { location?: Location }).location;
  if (!loc) return;
  if (loc.pathname === path) return;
  loc.assign(path);
}

function closeOne(path: string, activePath: string): void {
  const list = tags.value;
  const i = list.findIndex((t) => t.path === path);
  if (i < 0 || list[i].fixed) return;
  const next = list.filter((t) => t.path !== path);
  tags.value = next;
  persist(next);
  ctx.value = null;
  if (path === activePath) {
    const fallback = next[Math.max(0, i - 1)] ?? next[0];
    if (fallback) go(fallback.path);
  }
}

function closeLeft(path: string): void {
  const i = tags.value.findIndex((t) => t.path === path);
  if (i <= 0) return;
  const next = tags.value.filter((t, idx) => t.fixed || idx >= i);
  tags.value = next;
  persist(next);
  go(path);
  ctx.value = null;
}

function closeRight(path: string): void {
  const i = tags.value.findIndex((t) => t.path === path);
  if (i < 0) return;
  const next = tags.value.filter((t, idx) => t.fixed || idx <= i);
  tags.value = next;
  persist(next);
  go(path);
  ctx.value = null;
}

function closeOther(path: string): void {
  const next = tags.value.filter((t) => t.fixed || t.path === path);
  tags.value = next;
  persist(next);
  go(path);
  ctx.value = null;
}

function closeAll(activePath: string): void {
  const next = tags.value.filter((t) => t.fixed);
  tags.value = next;
  persist(next);
  const home = next[0]?.path ?? "/";
  if (activePath !== home) go(home);
  ctx.value = null;
}

function reloadCurrent(path: string, activePath: string): void {
  ctx.value = null;
  const loc = (globalThis as { location?: Location }).location;
  if (!loc) return;
  if (path !== activePath) {
    go(path);
    return;
  }
  loc.reload();
}

export function TagView(props: {
  /** Raw tags cookie value read by the server (so SSR renders the same strip as the client). */
  cookie?: string;
  pathname: string;
  title: string;
  dashboardTitle: string;
  labels: {
    closeLeft: string;
    closeRight: string;
    closeOther: string;
    closeAll: string;
    /** Optional: reload current page (Vue TagView refresh). */
    refresh?: string;
  };
}) {
  const active = props.pathname;
  // Server: render from the request cookie only (module state must never leak between requests).
  const serverList = isServer()
    ? withTag(parseTagsValue(props.cookie, props.dashboardTitle), props.pathname, props.title, props.dashboardTitle)
    : null;
  if (!serverList) upsert(props.pathname, props.title, props.dashboardTitle);

  onMount(() => {
    const doc = (globalThis as {
      document?: {
        addEventListener: (t: string, fn: () => void) => void;
        removeEventListener: (t: string, fn: () => void) => void;
      };
    }).document;
    if (!doc) return;
    const hide = () => {
      ctx.value = null;
    };
    doc.addEventListener("click", hide);
    onCleanup(() => doc.removeEventListener("click", hide));
  });

  return (
    <div class="adm-tag-view relative flex shrink-0 flex-nowrap gap-0 overflow-x-auto" data-testid="tag-view">
      {() =>
        (serverList ?? tags.value).map((tag) => {
          const on = tag.path === active;
          return (
            <div
              key={tag.path}
              class={`adm-tag-item ${on ? "adm-tag-on" : ""}`}
              data-testid={`tag-${tag.path}`}
              data-active={on ? "1" : "0"}
              onContextMenu={(e: Event) => {
                e.preventDefault();
                const me = e as unknown as { clientX: number; clientY: number };
                ctx.value = { x: me.clientX, y: me.clientY, path: tag.path };
              }}
            >
              <Link href={tag.path} class="adm-tag-link truncate no-underline">
                {tag.title}
              </Link>
              {!tag.fixed
                ? (
                  <button
                    type="button"
                    class="adm-tag-close"
                    aria-label="close"
                    onClick={(e: Event) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeOne(tag.path, active);
                    }}
                  >
                    <IconClose size="xs" />
                  </button>
                )
                : null}
            </div>
          );
        })}
      {() => {
        const m = ctx.value;
        if (!m) return null;
        return (
          <div
            class="adm-tag-ctx"
            style={`position:fixed;left:${m.x}px;top:${m.y}px;z-index:80`}
            data-testid="tag-context-menu"
            onClick={(e: Event) => e.stopPropagation()}
          >
            {props.labels.refresh
              ? (
                <button
                  type="button"
                  class="adm-tag-ctx-item"
                  onClick={() => reloadCurrent(m.path, active)}
                >
                  {props.labels.refresh}
                </button>
              )
              : null}
            <button type="button" class="adm-tag-ctx-item" onClick={() => closeLeft(m.path)}>
              {props.labels.closeLeft}
            </button>
            <button type="button" class="adm-tag-ctx-item" onClick={() => closeRight(m.path)}>
              {props.labels.closeRight}
            </button>
            <button type="button" class="adm-tag-ctx-item" onClick={() => closeOther(m.path)}>
              {props.labels.closeOther}
            </button>
            <button type="button" class="adm-tag-ctx-item" onClick={() => closeAll(active)}>
              {props.labels.closeAll}
            </button>
          </div>
        );
      }}
    </div>
  );
}
