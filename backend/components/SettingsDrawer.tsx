/**
 * Page settings drawer — Vue TopHeader settings panel (subset).
 * Breadcrumb toggle + primary theme color (CSS var --dweb-primary).
 */
import { createSignal, onMount } from "@dreamer/view";
import { ColorPicker, Drawer, Switch } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

export const settingsOpen = createSignal(false);
export const breadcrumbOn = createSignal(true);
export const primaryColor = createSignal("#2563eb");

const BREADCRUMB_KEY = "dweb-admin-breadcrumb";
const PRIMARY_KEY = "dweb-admin-primary";

const PRESETS = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#dc2626", // red
  "#ea580c", // orange
  "#ca8a04", // yellow
  "#16a34a", // green
  "#0d9488", // teal
  "#0891b2", // cyan
  "#475569", // slate
];

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
  return "#2563eb";
}

export function applyPrimaryColor(hex: string): void {
  primaryColor.value = hex;
  try {
    const root = (globalThis as { document?: { documentElement?: { style: { setProperty: (k: string, v: string) => void } } } }).document?.documentElement;
    if (root) {
      root.style.setProperty("--dweb-primary", hex);
      root.style.setProperty("--color-primary", hex);
    }
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(PRIMARY_KEY, hex);
  } catch { /* ignore */ }
}

/** Call once from layout onMount so color applies even if drawer never opens. */
export function initPrimaryColor(): void {
  applyPrimaryColor(readPrimaryPref());
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
      width={360}
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

        <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{tr("shell.settingsHint")}</p>
      </div>
    </Drawer>
  );
}
