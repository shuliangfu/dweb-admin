/**
 * Page settings drawer.
 * Defaults follow senvis backend chrome (teal primary, slate sidebar/header).
 * Saved picks still override --adm-* and semantic colors.
 */
import { createSignal, onMount } from "@dreamer/view";
import { ColorPicker, Drawer } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

export const settingsOpen = createSignal(false);
export const primaryColor = createSignal("#14b8a6");

const PRIMARY_KEY = "dweb-admin-primary";
const OTHER_KEY = "dweb-admin-theme-other";
const SEMANTIC_KEY = "dweb-admin-theme-semantic";

const DEFAULT_PRIMARY = "#14b8a6";
/** Previous template auto-saved this Vue blue; treat it as unset so senvis teal applies. */
const LEGACY_PRIMARY = "#3c8dbc";

const PRESETS = [
  "#14b8a6",
  "#0d9488",
  "#2563eb",
  "#3c8dbc",
  "#409eff",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#475569",
];

/** Senvis semantic 500. A saved pick writes both 500 and 600. */
type SemanticTok = {
  id: string;
  cssVars: string[];
  labelKey: string;
  def: string;
};
const SEMANTIC: SemanticTok[] = [
  {
    id: "success",
    cssVars: ["--color-success-600", "--color-success-500"],
    labelKey: "shell.colorSuccess",
    def: "#22c55e",
  },
  {
    id: "info",
    cssVars: ["--color-info-600", "--color-info-500"],
    labelKey: "shell.colorInfo",
    def: "#06b6d4",
  },
  {
    id: "warning",
    cssVars: ["--color-warning-600", "--color-warning-500"],
    labelKey: "shell.colorWarning",
    def: "#f59e0b",
  },
  {
    id: "danger",
    cssVars: ["--color-danger-600", "--color-danger-500"],
    labelKey: "shell.colorDanger",
    def: "#ef4444",
  },
];
const LEGACY_SEMANTIC: Record<string, string> = {
  success: "#00a65a",
  info: "#00c0ef",
  warning: "#f39c12",
  danger: "#dd4b39",
};

/**
 * Vue theme.other keys that map onto live --adm-* chrome vars.
 * Residual Vue tokens (tag bottom-border merge, light top blue default): see docs/handoff.md.
 */
type OtherTok = {
  id: string;
  cssVar: string;
  labelKey: string;
  light: string;
  dark: string;
};
const OTHER: OtherTok[] = [
  {
    id: "side",
    cssVar: "--adm-side",
    labelKey: "shell.tokSide",
    light: "#020617",
    dark: "#0f172a",
  },
  {
    id: "sub",
    cssVar: "--adm-sub",
    labelKey: "shell.tokSub",
    light: "#020617",
    dark: "#0f172a",
  },
  {
    id: "subHover",
    cssVar: "--adm-sub-hover",
    labelKey: "shell.tokSubHover",
    light: "#1e293b",
    dark: "#1e293b",
  },
  {
    id: "activeBg",
    cssVar: "--adm-active-bg",
    labelKey: "shell.tokActiveBg",
    light: "#020617",
    dark: "#020617",
  },
  {
    id: "text",
    cssVar: "--adm-text",
    labelKey: "shell.tokMenuText",
    light: "#cbd5e1",
    dark: "#cbd5e1",
  },
  {
    id: "textHover",
    cssVar: "--adm-text-hover",
    labelKey: "shell.tokMenuActive",
    light: "#ffffff",
    dark: "#ffffff",
  },
  {
    id: "brandStrip",
    cssVar: "--adm-brand-strip",
    labelKey: "shell.tokBrand",
    light: "#1e293b",
    dark: "#0f172a",
  },
  {
    id: "brandFg",
    cssVar: "--adm-brand-fg",
    labelKey: "shell.tokBrandFg",
    light: "#ffffff",
    dark: "#ffffff",
  },
  {
    id: "topBg",
    cssVar: "--adm-top-bg",
    labelKey: "shell.tokTopBg",
    light: "#1e293b",
    dark: "#0f172a",
  },
  {
    id: "topFg",
    cssVar: "--adm-top-fg",
    labelKey: "shell.tokTopFg",
    light: "#ffffff",
    dark: "#ffffff",
  },
  {
    id: "tagBg",
    cssVar: "--adm-tag-bg",
    labelKey: "shell.tokTagBg",
    light: "#f8fafc",
    dark: "#0f172a",
  },
  {
    id: "tagBorder",
    cssVar: "--adm-tag-border",
    labelKey: "shell.tokTagBorder",
    light: "#e2e8f0",
    dark: "#1e293b",
  },
  {
    id: "tagItemBorder",
    cssVar: "--adm-tag-item-border",
    labelKey: "shell.tokTagItemBorder",
    light: "#cbd5e1",
    dark: "#334155",
  },
  {
    id: "tagFg",
    cssVar: "--adm-tag-fg",
    labelKey: "shell.tokTagFg",
    light: "#334155",
    dark: "#e2e8f0",
  },
  {
    id: "content",
    cssVar: "--adm-content",
    labelKey: "shell.tokContent",
    light: "#f8fafc",
    dark: "#0f172a",
  },
  {
    id: "fg",
    cssVar: "--adm-fg",
    labelKey: "shell.tokFg",
    light: "#334155",
    dark: "#e2e8f0",
  },
  {
    id: "cardTitleBg",
    cssVar: "--adm-card-title-bg",
    labelKey: "shell.tokCardTitleBg",
    light: "#d9edf7",
    dark: "#0f172a",
  },
  {
    id: "cardTitleFg",
    cssVar: "--adm-card-title-fg",
    labelKey: "shell.tokCardTitleFg",
    light: "#31708f",
    dark: "#e2e8f0",
  },
  {
    id: "cardBorder",
    cssVar: "--adm-card-border",
    labelKey: "shell.tokCardBorder",
    light: "#bce8f1",
    dark: "#1e293b",
  },
  {
    id: "descKey",
    cssVar: "--adm-desc-key",
    labelKey: "shell.tokDescKey",
    light: "#334155",
    dark: "#cbd5e1",
  },
  {
    id: "descBg",
    cssVar: "--adm-desc-bg",
    labelKey: "shell.tokDescBg",
    light: "#ffffff",
    dark: "#0f172a",
  },
  {
    id: "descZebra",
    cssVar: "--adm-desc-zebra",
    labelKey: "shell.tokDescZebra",
    light: "#f8fafc",
    dark: "#020617",
  },
  {
    id: "descValue",
    cssVar: "--adm-desc-value",
    labelKey: "shell.tokDescValue",
    light: "#0f172a",
    dark: "#e2e8f0",
  },
  {
    id: "descLine",
    cssVar: "--adm-desc-line",
    labelKey: "shell.tokDescLine",
    light: "#e2e8f0",
    dark: "#1e293b",
  },
  {
    id: "dialogTitle",
    cssVar: "--adm-dialog-title",
    labelKey: "shell.tokDialogTitle",
    light: "#0f172a",
    dark: "#e2e8f0",
  },
  {
    id: "dialogLine",
    cssVar: "--adm-dialog-line",
    labelKey: "shell.tokDialogLine",
    light: "#e2e8f0",
    dark: "#1e293b",
  },
];
const LEGACY_SIDE = new Set(["#222e32", "#222d32"]);
/** Previous panel-header defaults; ignore so the AdminLTE info bar can show. */
const SUPERSEDED_OTHER: Record<string, string> = {
  cardTitleBg: "#f0fdfa",
  cardTitleFg: "#0f766e",
  cardBorder: "#99f6e4",
  content: "#020617",
  // Earlier light-mode navbar/logo defaults that a browser may have persisted; drop them so #1e293b applies.
  brandStrip: "#0f172a",
  topBg: "#0f172a",
  // Old dark-mode sidebar default (now equal to the navbar #0f172a).
  side: "#020617",
  sub: "#020617",
};

/** Vue length tokens (menu item height / radius) — not colors. */
type SizeTok = { id: string; cssVar: string; labelKey: string; def: string };
const SIZES: SizeTok[] = [
  {
    id: "menuItemH",
    cssVar: "--adm-menu-item-h",
    labelKey: "shell.tokMenuItemH",
    def: "45px",
  },
  {
    id: "menuSubH",
    cssVar: "--adm-menu-sub-h",
    labelKey: "shell.tokMenuSubH",
    def: "30px",
  },
  {
    id: "radius",
    cssVar: "--adm-radius",
    labelKey: "shell.tokRadius",
    def: "5px",
  },
];
const SIZE_KEY = "dweb-admin-theme-sizes";

const otherValues = createSignal<Record<string, string>>({});
const semanticValues = createSignal<Record<string, string>>({});
const sizeValues = createSignal<Record<string, string>>({});

function rootEl() {
  return (globalThis as {
    document?: {
      documentElement?: {
        style: {
          setProperty: (k: string, v: string) => void;
          removeProperty: (k: string) => void;
        };
        classList: { contains: (c: string) => boolean };
      };
    };
  }).document?.documentElement;
}

function isDark(): boolean {
  try {
    return !!rootEl()?.classList.contains("dark");
  } catch {
    return false;
  }
}

function readJson(key: string): Record<string, string> {
  try {
    const raw = (globalThis as { localStorage?: Storage }).localStorage
      ?.getItem(key);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, string>;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function writeJson(key: string, o: Record<string, string>): void {
  try {
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(
      key,
      JSON.stringify(o),
    );
  } catch { /* ignore */ }
}

function storedPrimary(): string | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    const v = ls?.getItem(PRIMARY_KEY);
    if (!v || !/^#[0-9a-fA-F]{6}$/.test(v)) return null;
    if (v.toLowerCase() === LEGACY_PRIMARY) {
      ls?.removeItem(PRIMARY_KEY);
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

export function readPrimaryPref(): string {
  return storedPrimary() ?? DEFAULT_PRIMARY;
}

export function applyPrimaryColor(hex: string): void {
  primaryColor.value = hex;
  try {
    const root = rootEl();
    if (root) {
      root.style.setProperty("--dweb-primary", hex);
      root.style.setProperty("--color-primary", hex);
      root.style.setProperty("--color-primary-500", hex);
      root.style.setProperty("--color-primary-600", hex);
      root.style.setProperty("--adm-accent", hex);
      root.style.setProperty("--adm-tag-on-fg", hex);
    }
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(
      PRIMARY_KEY,
      hex,
    );
  } catch { /* ignore */ }
}

function applyOther(id: string, hex: string): void {
  const tok = OTHER.find((t) => t.id === id);
  if (!tok || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const next = { ...otherValues.value, [id]: hex };
  otherValues.value = next;
  writeJson(OTHER_KEY, next);
  try {
    rootEl()?.style.setProperty(tok.cssVar, hex);
  } catch { /* ignore */ }
}

function applySize(id: string, raw: string): void {
  const tok = SIZES.find((t) => t.id === id);
  const v = raw.trim();
  if (!tok || !/^\d+(\.\d+)?(px|rem)$/.test(v)) return;
  const next = { ...sizeValues.value, [id]: v };
  sizeValues.value = next;
  writeJson(SIZE_KEY, next);
  try {
    rootEl()?.style.setProperty(tok.cssVar, v);
  } catch { /* ignore */ }
}

function applySemantic(id: string, hex: string): void {
  const tok = SEMANTIC.find((t) => t.id === id);
  if (!tok || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const next = { ...semanticValues.value, [id]: hex };
  semanticValues.value = next;
  writeJson(SEMANTIC_KEY, next);
  try {
    const root = rootEl();
    if (root) { for (const v of tok.cssVars) root.style.setProperty(v, hex); }
  } catch { /* ignore */ }
}

function initOtherAndSemantic(): void {
  let savedOther = readJson(OTHER_KEY);
  if (LEGACY_SIDE.has(String(savedOther.side ?? "").toLowerCase())) {
    savedOther = {};
    try {
      (globalThis as { localStorage?: Storage }).localStorage?.removeItem(
        OTHER_KEY,
      );
    } catch { /* ignore */ }
  }
  const savedSem = readJson(SEMANTIC_KEY);
  const dark = isDark();
  const o: Record<string, string> = {};
  for (const t of OTHER) {
    const rawSaved = savedOther[t.id];
    const stale = SUPERSEDED_OTHER[t.id];
    const saved = stale && String(rawSaved ?? "").toLowerCase() === stale
      ? undefined
      : rawSaved;
    const custom = !!saved && /^#[0-9a-fA-F]{6}$/.test(saved);
    o[t.id] = custom ? saved : (dark ? t.dark : t.light);
    try {
      const root = rootEl();
      if (!root) continue;
      if (custom) root.style.setProperty(t.cssVar, saved);
      else root.style.removeProperty(t.cssVar);
    } catch { /* ignore */ }
  }
  otherValues.value = o;
  const s: Record<string, string> = {};
  let semDirty = false;
  const nextSem = { ...savedSem };
  for (const t of SEMANTIC) {
    const raw = savedSem[t.id];
    const legacy = LEGACY_SEMANTIC[t.id];
    const custom = raw && /^#[0-9a-fA-F]{6}$/.test(raw) &&
      raw.toLowerCase() !== legacy;
    const hex = custom ? raw : t.def;
    s[t.id] = hex;
    if (custom) {
      try {
        const root = rootEl();
        if (root) { for (const v of t.cssVars) root.style.setProperty(v, hex); }
      } catch { /* ignore */ }
    } else {
      try {
        const root = rootEl();
        if (root) { for (const v of t.cssVars) root.style.removeProperty(v); }
      } catch { /* ignore */ }
      if (raw) {
        delete nextSem[t.id];
        semDirty = true;
      }
    }
  }
  if (semDirty) writeJson(SEMANTIC_KEY, nextSem);
  semanticValues.value = s;
  const savedSize = readJson(SIZE_KEY);
  const sz: Record<string, string> = {};
  for (const t of SIZES) {
    const v = savedSize[t.id] && /^\d+(\.\d+)?(px|rem)$/.test(savedSize[t.id])
      ? savedSize[t.id]
      : t.def;
    sz[t.id] = v;
    try {
      rootEl()?.style.setProperty(t.cssVar, v);
    } catch { /* ignore */ }
  }
  sizeValues.value = sz;
}

/** Call once from layout onMount so color applies even if drawer never opens. */
export function initPrimaryColor(): void {
  const stored = storedPrimary();
  primaryColor.value = stored ?? DEFAULT_PRIMARY;
  if (stored) applyPrimaryColor(stored);
  initOtherAndSemantic();
}

function ColorRow(
  props: { label: string; hex: string; onPick: (hex: string) => void },
) {
  return (
    <label class="flex items-center justify-between gap-3 text-sm">
      <span class="min-w-0 flex-1 truncate">{props.label}</span>
      <input
        type="color"
        value={props.hex}
        class="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-transparent p-0 dark:border-slate-600"
        onInput={(e: Event) => {
          const v = (e.target as unknown as { value: string }).value;
          if (v) props.onPick(v);
        }}
      />
      <span class="w-16 shrink-0 font-mono text-xs text-slate-500">
        {props.hex}
      </span>
    </label>
  );
}

function SizeRow(
  props: { label: string; value: string; onCommit: (v: string) => void },
) {
  return (
    <label class="flex items-center justify-between gap-3 text-sm">
      <span class="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
        {props.label}
      </span>
      <input
        type="text"
        value={props.value}
        class="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
        onChange={(e: Event) => {
          const v = (e.target as unknown as { value: string }).value;
          props.onCommit(v);
        }}
      />
    </label>
  );
}

export function SettingsDrawer(props: { locale: Locale }) {
  const tr = createT(props.locale);
  onMount(() => {
    initPrimaryColor();
  });

  return (
    <Drawer
      open={settingsOpen}
      placement="right"
      width={400}
      title={tr("shell.settingsTitle")}
      onClose={() => {
        settingsOpen.value = false;
      }}
    >
      <div class="flex flex-col gap-5 p-1" data-testid="settings-drawer">
        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium">{tr("shell.primaryColor")}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {tr("shell.primaryPresets")}
          </div>
          <div class="flex flex-wrap gap-2">
            {PRESETS.map((hex) => (
              <button
                type="button"
                title={hex}
                class="h-7 w-7 rounded-full border-2 border-white shadow ring-1 ring-slate-200 dark:border-slate-800 dark:ring-slate-600"
                style={{
                  backgroundColor: hex,
                  outline: primaryColor.value === hex
                    ? `2px solid ${hex}`
                    : undefined,
                  outlineOffset: "2px",
                }}
                onClick={() => applyPrimaryColor(hex)}
              />
            ))}
          </div>
          <div class="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{tr("shell.primaryCustom")}</span>
            <ColorPicker
              value={primaryColor}
              onChange={(e: Event) => {
                const v = (e.target as unknown as { value: string }).value;
                if (v) applyPrimaryColor(v);
              }}
            />
            <span class="font-mono">{primaryColor.value}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium">{tr("shell.semanticTitle")}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {tr("shell.semanticHint")}
          </div>
          {() =>
            SEMANTIC.map((t) => (
              <ColorRow
                label={tr(t.labelKey)}
                hex={semanticValues.value[t.id] ?? t.def}
                onPick={(hex) => applySemantic(t.id, hex)}
              />
            ))}
        </div>

        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium">{tr("shell.otherTitle")}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {tr("shell.otherHint")}
          </div>
          {() =>
            OTHER.map((t) => (
              <ColorRow
                label={tr(t.labelKey)}
                hex={otherValues.value[t.id] ?? (isDark() ? t.dark : t.light)}
                onPick={(hex) => applyOther(t.id, hex)}
              />
            ))}
        </div>

        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium">{tr("shell.sizeTitle")}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {tr("shell.sizeHint")}
          </div>
          {() =>
            SIZES.map((t) => (
              <SizeRow
                label={tr(t.labelKey)}
                value={sizeValues.value[t.id] ?? t.def}
                onCommit={(v) => applySize(t.id, v)}
              />
            ))}
        </div>

        <p class="m-0 text-xs text-slate-500 dark:text-slate-400">
          {tr("shell.settingsHint")}
        </p>
        <p class="m-0 text-xs text-slate-400 dark:text-slate-500">
          {tr("shell.otherGap")}
        </p>
      </div>
    </Drawer>
  );
}
