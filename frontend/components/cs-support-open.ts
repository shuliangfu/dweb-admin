/**
 * FE guest CS float — open/close + drag position persistence.
 * - Open: localStorage `dweb_admin_cs_support_open` = "1"；关窗 remove。
 * - Position: localStorage `dweb_admin_cs_support_pos` = {"x","y"}（Modal translate 偏移）；关窗保留。
 * marker: FE_CS_OPEN_POS_PERSIST_20261107
 */
import { createSignal } from "@dreamer/view";

const LS_OPEN = "dweb_admin_cs_support_open";
const LS_POS = "dweb_admin_cs_support_pos";

export type CsPos = { x: number; y: number };

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

function persistOpen(open: boolean): void {
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
export const csSupportOpen = createSignal(readPersistedOpen());

/** Drag translate offset — restored from LS; kept across close. */
export const csSupportPos = createSignal<CsPos>(readPersistedPos());

export function openCsSupport(): void {
  csSupportOpen.value = true;
  persistOpen(true);
}

export function closeCsSupport(): void {
  csSupportOpen.value = false;
  persistOpen(false);
}

export function toggleCsSupport(): void {
  if (csSupportOpen.value) closeCsSupport();
  else openCsSupport();
}

/** Persist Modal translate after drag (and apply to signal for live restore). */
export function setCsSupportPos(pos: CsPos): void {
  const next = {
    x: Number.isFinite(pos.x) ? pos.x : 0,
    y: Number.isFinite(pos.y) ? pos.y : 0,
  };
  csSupportPos.value = next;
  try {
    ls()?.setItem(LS_POS, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
