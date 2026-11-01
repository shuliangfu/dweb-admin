/**
 * Page settings drawer — Vue TopHeader settings panel.
 * Breadcrumb + primary (theme.main) + Vue theme.other → --adm-* (incl. card/desc zebra,
 * menu heights, radius, sub-hover, text-regular). Size tokens use length inputs.
 */
import { createSignal, onMount } from "@dreamer/view";
import { ColorPicker, Drawer, Switch } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

export const settingsOpen = createSignal(false);
export const breadcrumbOn = createSignal(true);
export const primaryColor = createSignal("#3c8dbc");

const BREADCRUMB_KEY = "dweb-admin-breadcrumb";
const PRIMARY_KEY = "dweb-admin-primary";
const OTHER_KEY = "dweb-admin-theme-other";
const SEMANTIC_KEY = "dweb-admin-theme-semantic";

const PRESETS = [
  "#3c8dbc",
  "#2563eb",
  "#409eff",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0d9488",
  "#475569",
];

/** Vue theme.main status colors → Tailwind semantic 600/500 used by ui-view. */
type SemanticTok = { id: string; cssVars: string[]; labelKey: string; def: string };
const SEMANTIC: SemanticTok[] = [
  { id: "success", cssVars: ["--color-success-600", "--color-success-500"], labelKey: "shell.colorSuccess", def: "#00a65a" },
  { id: "info", cssVars: ["--color-info-600", "--color-info-500"], labelKey: "shell.colorInfo", def: "#00c0ef" },
  { id: "warning", cssVars: ["--color-warning-600", "--color-warning-500"], labelKey: "shell.colorWarning", def: "#f39c12" },
  { id: "danger", cssVars: ["--color-danger-600", "--color-danger-500"], labelKey: "shell.colorDanger", def: "#dd4b39" },
];

/**
 * Vue theme.other keys that map onto live --adm-* chrome vars.
 * Residual Vue tokens (tag bottom-border merge, light top blue default): see docs/handoff.md.
 */
type OtherTok = { id: string; cssVar: string; labelKey: string; light: string; dark: string };
const OTHER: OtherTok[] = [
  { id: "side", cssVar: "--adm-side", labelKey: "shell.tokSide", light: "#222e32", dark: "#11181b" },
  { id: "sub", cssVar: "--adm-sub", labelKey: "shell.tokSub", light: "#2c3b41", dark: "#182226" },
  { id: "subHover", cssVar: "--adm-sub-hover", labelKey: "shell.tokSubHover", light: "#2c3b41", dark: "#182226" },
  { id: "activeBg", cssVar: "--adm-active-bg", labelKey: "shell.tokActiveBg", light: "#1e282c", dark: "#0b1113" },
  { id: "text", cssVar: "--adm-text", labelKey: "shell.tokMenuText", light: "#8aa4af", dark: "#b7b7b7" },
  { id: "textHover", cssVar: "--adm-text-hover", labelKey: "shell.tokMenuActive", light: "#ffffff", dark: "#ffffff" },
  { id: "brandStrip", cssVar: "--adm-brand-strip", labelKey: "shell.tokBrand", light: "#367fa9", dark: "#0b1113" },
  { id: "brandFg", cssVar: "--adm-brand-fg", labelKey: "shell.tokBrandFg", light: "#ffffff", dark: "#b7b7b7" },
  { id: "topBg", cssVar: "--adm-top-bg", labelKey: "shell.tokTopBg", light: "#ffffff", dark: "#1e2937" },
  { id: "topFg", cssVar: "--adm-top-fg", labelKey: "shell.tokTopFg", light: "#334155", dark: "#e2e8f0" },
  { id: "tagBg", cssVar: "--adm-tag-bg", labelKey: "shell.tokTagBg", light: "#f9f9f9", dark: "#1d1e20" },
  { id: "tagBorder", cssVar: "--adm-tag-border", labelKey: "shell.tokTagBorder", light: "#e4e7ed", dark: "#334155" },
  { id: "tagItemBorder", cssVar: "--adm-tag-item-border", labelKey: "shell.tokTagItemBorder", light: "#dcdfe6", dark: "#475569" },
  { id: "tagFg", cssVar: "--adm-tag-fg", labelKey: "shell.tokTagFg", light: "#606266", dark: "#b7b7b7" },
  { id: "content", cssVar: "--adm-content", labelKey: "shell.tokContent", light: "#f2f3f5", dark: "#1d1e20" },
  { id: "fg", cssVar: "--adm-fg", labelKey: "shell.tokFg", light: "#606266", dark: "#b7b7b7" },
  { id: "cardTitleBg", cssVar: "--adm-card-title-bg", labelKey: "shell.tokCardTitleBg", light: "#d9edf7", dark: "#141414" },
  { id: "cardTitleFg", cssVar: "--adm-card-title-fg", labelKey: "shell.tokCardTitleFg", light: "#367fa9", dark: "#b7b7b7" },
  { id: "cardBorder", cssVar: "--adm-card-border", labelKey: "shell.tokCardBorder", light: "#bce8f1", dark: "#363637" },
  { id: "descKey", cssVar: "--adm-desc-key", labelKey: "shell.tokDescKey", light: "#606266", dark: "#a6a6a6" },
  { id: "descBg", cssVar: "--adm-desc-bg", labelKey: "shell.tokDescBg", light: "#ffffff", dark: "#141414" },
  { id: "descZebra", cssVar: "--adm-desc-zebra", labelKey: "shell.tokDescZebra", light: "#fafafa", dark: "#1d1d1d" },
  { id: "descValue", cssVar: "--adm-desc-value", labelKey: "shell.tokDescValue", light: "#303133", dark: "#a6a6a6" },
  { id: "descLine", cssVar: "--adm-desc-line", labelKey: "shell.tokDescLine", light: "#ebeef5", dark: "#363637" },
  { id: "dialogTitle", cssVar: "--adm-dialog-title", labelKey: "shell.tokDialogTitle", light: "#303133", dark: "#a6a6a6" },
  { id: "dialogLine", cssVar: "--adm-dialog-line", labelKey: "shell.tokDialogLine", light: "#ebeef5", dark: "#363637" },
];

/** Vue length tokens (menu item height / radius) — not colors. */
type SizeTok = { id: string; cssVar: string; labelKey: string; def: string };
const SIZES: SizeTok[] = [
  { id: "menuItemH", cssVar: "--adm-menu-item-h", labelKey: "shell.tokMenuItemH", def: "45px" },
  { id: "menuSubH", cssVar: "--adm-menu-sub-h", labelKey: "shell.tokMenuSubH", def: "30px" },
  { id: "radius", cssVar: "--adm-radius", labelKey: "shell.tokRadius", def: "5px" },
];
const SIZE_KEY = "dweb-admin-theme-sizes";

const otherValues = createSignal<Record<string, string>>({});
const semanticValues = createSignal<Record<string, string>>({});
const sizeValues = createSignal<Record<string, string>>({});

function rootEl() {
  return (globalThis as { document?: { documentElement?: { style: { setProperty: (k: string, v: string) => void }; classList: { contains: (c: string) => boolean } } } }).document?.documentElement;
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
    const raw = (globalThis as { localStorage?: Storage }).localStorage?.getItem(key);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, string>;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function writeJson(key: string, o: Record<string, string>): void {
  try {
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(key, JSON.stringify(o));
  } catch { /* ignore */ }
}

export function readBreadcrumbPref(): boolean {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return true;
    const v = ls.getItem(BREADCRUMB_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch { /* ignore */ }
  return true;
}

function persistBreadcrumb(on: boolean): void {
  try {
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(BREADCRUMB_KEY, on ? "1" : "0");
  } catch { /* ignore */ }
}

export function readPrimaryPref(): string {
  try {
    const v = (globalThis as { localStorage?: Storage }).localStorage?.getItem(PRIMARY_KEY);
    if (v && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
  } catch { /* ignore */ }
  return "#3c8dbc";
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
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(PRIMARY_KEY, hex);
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
    if (root) for (const v of tok.cssVars) root.style.setProperty(v, hex);
  } catch { /* ignore */ }
}

function initOtherAndSemantic(): void {
  const savedOther = readJson(OTHER_KEY);
  const savedSem = readJson(SEMANTIC_KEY);
  const dark = isDark();
  const o: Record<string, string> = {};
  for (const t of OTHER) {
    const hex = savedOther[t.id] && /^#[0-9a-fA-F]{6}$/.test(savedOther[t.id])
      ? savedOther[t.id]
      : (dark ? t.dark : t.light);
    o[t.id] = hex;
    try {
      rootEl()?.style.setProperty(t.cssVar, hex);
    } catch { /* ignore */ }
  }
  otherValues.value = o;
  const s: Record<string, string> = {};
  for (const t of SEMANTIC) {
    const hex = savedSem[t.id] && /^#[0-9a-fA-F]{6}$/.test(savedSem[t.id])
      ? savedSem[t.id]
      : t.def;
    s[t.id] = hex;
    try {
      const root = rootEl();
      if (root) for (const v of t.cssVars) root.style.setProperty(v, hex);
    } catch { /* ignore */ }
  }
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
  applyPrimaryColor(readPrimaryPref());
  initOtherAndSemantic();
}

function ColorRow(props: { label: string; hex: string; onPick: (hex: string) => void }) {
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
      <span class="w-16 shrink-0 font-mono text-xs text-slate-500">{props.hex}</span>
    </label>
  );
}

function SizeRow(props: { label: string; value: string; onCommit: (v: string) => void }) {
  return (
    <label class="flex items-center justify-between gap-3 text-sm">
      <span class="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{props.label}</span>
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
    breadcrumbOn.value = readBreadcrumbPref();
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
        <label class="flex items-center justify-between gap-3 text-sm">
          <span>{tr("shell.breadcrumb")}</span>
          <Switch
            checked={breadcrumbOn}
            onChange={(e: Event) => {
              const v = (e.target as unknown as { checked: boolean }).checked;
              breadcrumbOn.value = v;
              persistBreadcrumb(v);
            }}
          />
        </label>

        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium">{tr("shell.primaryColor")}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">{tr("shell.primaryPresets")}</div>
          <div class="flex flex-wrap gap-2">
            {PRESETS.map((hex) => (
              <button
                type="button"
                title={hex}
                class="h-7 w-7 rounded-full border-2 border-white shadow ring-1 ring-slate-200 dark:border-slate-800 dark:ring-slate-600"
                style={{
                  backgroundColor: hex,
                  outline: primaryColor.value === hex ? `2px solid ${hex}` : undefined,
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
          <div class="text-xs text-slate-500 dark:text-slate-400">{tr("shell.semanticHint")}</div>
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
          <div class="text-xs text-slate-500 dark:text-slate-400">{tr("shell.otherHint")}</div>
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
          <div class="text-xs text-slate-500 dark:text-slate-400">{tr("shell.sizeHint")}</div>
          {() =>
            SIZES.map((t) => (
              <SizeRow
                label={tr(t.labelKey)}
                value={sizeValues.value[t.id] ?? t.def}
                onCommit={(v) => applySize(t.id, v)}
              />
            ))}
        </div>

        <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{tr("shell.settingsHint")}</p>
        <p class="m-0 text-xs text-slate-400 dark:text-slate-500">{tr("shell.otherGap")}</p>
      </div>
    </Drawer>
  );
}
