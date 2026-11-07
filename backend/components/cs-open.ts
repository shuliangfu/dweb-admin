/**
 * Admin CS entry — open by viewport + float drag position persistence.
 *   <768  → full-page /chat (same tab)；清 open 标记
 *   ≥768  → in-app ui-view Modal float / fill (draggable)
 *
 * LS keys:
 * - `dweb_admin_cs_float_open` = "1" while float open；关窗／走全页清掉
 * - `dweb_admin_cs_float_pos` = {"x","y"} Modal translate；关窗保留
 * marker: BE_CS_OPEN_POS_PERSIST_20261107
 */
import { createSignal } from "@dreamer/view";

export type CsOpenMode = "page" | "float" | "popup";
export type CsPos = { x: number; y: number };

export const CS_MOBILE_MAX = 767;
export const CS_TABLET_MAX = 1023;
/** Kept for /chat opened with this window.name (legacy popup / e2e). */
export const CS_POPUP_NAME = "dweb-admin-cs";

const LS_OPEN = "dweb_admin_cs_float_open";
const LS_POS = "dweb_admin_cs_float_pos";

function ls(): Storage | undefined {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage;
  } catch {
    return undefined;
  }
}

function readPersistedOpen(): boolean {
  try {
    return ls()?.getItem(LS_OPEN) === "1";
  } catch {
    return false;
  }
}

function persistFloatOpen(open: boolean): void {
  try {
    const s = ls();
    if (!s) return;
    if (open) s.setItem(LS_OPEN, "1");
    else s.removeItem(LS_OPEN);
  } catch {
    /* ignore */
  }
}

function readPersistedPos(): CsPos {
  try {
    const raw = ls()?.getItem(LS_POS);
    if (!raw) return { x: 0, y: 0 };
    const o = JSON.parse(raw) as { x?: unknown; y?: unknown };
    const x = Number(o?.x);
    const y = Number(o?.y);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
    };
  } catch {
    return { x: 0, y: 0 };
  }
}

/** Shared float open flag — restored from LS on load. */
export const csFloatOpen = createSignal(readPersistedOpen());

/** Drag translate offset — restored from LS; kept across close. */
export const csFloatPos = createSignal<CsPos>(readPersistedPos());

type BrowserWin = {
  innerWidth: number;
  name: string;
  open: (url?: string, target?: string, features?: string) => unknown;
  location: { assign: (url: string) => void };
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function browserWin(): BrowserWin | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as unknown as { window?: BrowserWin; innerWidth?: number };
  if (g.window && typeof g.window.open === "function") return g.window;
  if (typeof g.innerWidth === "number") return g as unknown as BrowserWin;
  return null;
}

export function csOpenMode(width?: number): CsOpenMode {
  const w = typeof width === "number"
    ? width
    : (browserWin()?.innerWidth ?? 1280);
  if (w <= CS_MOBILE_MAX) return "page";
  if (w <= CS_TABLET_MAX) return "float";
  return "popup";
}

/** Whether the current viewport uses the large desktop fill panel. */
export function csFloatIsDesktop(width?: number): boolean {
  const w = typeof width === "number"
    ? width
    : (browserWin()?.innerWidth ?? 1280);
  return w > CS_TABLET_MAX;
}

export function openAdminCs(): void {
  const win = browserWin();
  if (!win) return;
  const mode = csOpenMode(win.innerWidth);
  if (mode === "page") {
    csFloatOpen.value = false;
    persistFloatOpen(false);
    win.location.assign("/chat");
    return;
  }
  csFloatOpen.value = true;
  persistFloatOpen(true);
}

export function closeCsFloat(): void {
  csFloatOpen.value = false;
  persistFloatOpen(false);
}

/** Persist Modal translate after drag. */
export function setCsFloatPos(pos: CsPos): void {
  const next = {
    x: Number.isFinite(pos.x) ? pos.x : 0,
    y: Number.isFinite(pos.y) ? pos.y : 0,
  };
  csFloatPos.value = next;
  try {
    ls()?.setItem(LS_POS, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
