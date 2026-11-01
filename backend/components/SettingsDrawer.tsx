/**
 * Page settings drawer — Vue TopHeader settings panel (subset).
 * Currently: show/hide breadcrumb. Theme color pickers deferred.
 */
import { createSignal, onMount } from "@dreamer/view";
import { Drawer, Switch } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";

export const settingsOpen = createSignal(false);
export const breadcrumbOn = createSignal(true);

const BREADCRUMB_KEY = "dweb-admin-breadcrumb";

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

export function SettingsDrawer(props: { locale: Locale }) {
  const tr = createT(props.locale);
  onMount(() => {
    breadcrumbOn.value = readBreadcrumbPref();
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
      <div class="flex flex-col gap-4 p-1" data-testid="settings-drawer">
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
        <p class="m-0 text-xs text-slate-500 dark:text-slate-400">{tr("shell.settingsHint")}</p>
      </div>
    </Drawer>
  );
}
