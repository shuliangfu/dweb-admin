/**
 * Visited-page tabs — Vue Layout/TagView (+ TagItem close / context actions).
 * Tags live in a module signal + localStorage so they survive layout re-renders.
 * Context menu uses native contextmenu (Vue uses el-dropdown trigger=contextmenu).
 */
import { createSignal, onMount } from "@dreamer/view";
import { IconClose, Link } from "@dreamer/ui-view";

export interface TagEntry {
  path: string;
  title: string;
  fixed?: boolean;
}

interface CtxMenu {
  x: number;
  y: number;
  path: string;
}

const STORAGE_KEY = "dweb-admin-tags";
const tags = createSignal<TagEntry[]>([]);
const ctx = createSignal<CtxMenu | null>(null);
let storageReady = false;

function persist(list: TagEntry[]): void {
  const ls = (globalThis as { localStorage?: Storage }).localStorage;
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

function ensureHome(list: TagEntry[], dashTitle: string): TagEntry[] {
  const home = list.find((t) => t.path === "/");
  if (!home) return [{ path: "/", title: dashTitle, fixed: true }, ...list];
  if (!home.fixed || home.title !== dashTitle) {
    return list.map((t) =>
      t.path === "/" ? { path: "/", title: dashTitle, fixed: true } : t
    );
  }
  return list;
}

function readStorage(dashTitle: string): TagEntry[] {
  const ls = (globalThis as { localStorage?: Storage }).localStorage;
  if (!ls) return [{ path: "/", title: dashTitle, fixed: true }];
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return [{ path: "/", title: dashTitle, fixed: true }];
    const parsed = JSON.parse(raw) as TagEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [{ path: "/", title: dashTitle, fixed: true }];
    }
    return ensureHome(
      parsed.filter((t) => t && typeof t.path === "string" && typeof t.title === "string"),
      dashTitle,
    );
  } catch {
    return [{ path: "/", title: dashTitle, fixed: true }];
  }
}

function hydrate(dashTitle: string): void {
  if (storageReady) return;
  storageReady = true;
  if (typeof (globalThis as { localStorage?: unknown }).localStorage === "undefined") {
    if (tags.value.length === 0) {
      tags.value = [{ path: "/", title: dashTitle, fixed: true }];
    }
    return;
  }
  tags.value = readStorage(dashTitle);
}

function upsert(path: string, title: string, dashTitle: string): void {
  hydrate(dashTitle);
  let list = ensureHome(tags.value, dashTitle);
  const i = list.findIndex((t) => t.path === path);
  if (i === -1) {
    list = [...list, { path, title: title || path }];
    tags.value = list;
    persist(list);
    return;
  }
  if (title && list[i].title !== title && !list[i].fixed) {
    list = list.slice();
    list[i] = { ...list[i], title };
    tags.value = list;
    persist(list);
  } else if (list !== tags.value) {
    tags.value = list;
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

export function TagView(props: {
  pathname: string;
  title: string;
  dashboardTitle: string;
  labels: {
    closeLeft: string;
    closeRight: string;
    closeOther: string;
    closeAll: string;
  };
}) {
  upsert(props.pathname, props.title, props.dashboardTitle);
  const active = props.pathname;

  onMount(() => {
    const doc = (globalThis as { document?: { addEventListener: (t: string, fn: () => void) => void } }).document;
    if (!doc) return;
    const hide = () => {
      ctx.value = null;
    };
    doc.addEventListener("click", hide);
  });

  return (
    <div class="adm-tag-view relative flex shrink-0 flex-nowrap gap-0 overflow-x-auto" data-testid="tag-view">
      {() =>
        tags.value.map((tag) => {
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
