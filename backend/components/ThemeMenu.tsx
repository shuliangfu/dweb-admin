/**
 * Theme: one icon, dropdown "Follow system / Light / Dark".
 * themePlugin (backend/main.ts) injects the anti-flash script and stores the mode under
 * cookieName; the options below use the SAME key (cookie + localStorage) so both agree.
 */
import { createSignal } from "@dreamer/view";
import { getTheme, type ThemeMode, type ThemeOptions } from "@dreamer/theme";
import { Dropdown, IconCheck, IconMoon, IconSun } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { closeMenus, itemCls, triggerCls } from "@backend/components/menu-kit.tsx";

export const THEME_KEY = "dweb-admin-theme";

const clientOptions: ThemeOptions = {
  defaultMode: "system",
  strategy: "class",
  darkClass: "dark",
  storageKey: THEME_KEY,
  storageType: "cookie",
  transitionDuration: 200,
};

const mode = createSignal<ThemeMode>("system");
const hasDom = () => typeof (globalThis as { document?: unknown }).document !== "undefined";

function sync(open: boolean): void {
  if (open && hasDom()) mode.value = getTheme(clientOptions).getMode();
}

function choose(m: ThemeMode): void {
  if (!hasDom()) return;
  getTheme(clientOptions).setMode(m);
  mode.value = m;
  closeMenus();
}

export function ThemeMenu(props: { locale: Locale; compact?: boolean }) {
  const tr = createT(props.locale);
  const items: { m: ThemeMode; label: string }[] = [
    { m: "system", label: tr("topbar.system") },
    { m: "light", label: tr("topbar.light") },
    { m: "dark", label: tr("topbar.dark") },
  ];
  return (
    <Dropdown
      placement="bottomAuto"
      onOpenChange={sync}
      overlay={
        <div data-testid="theme-options">
          {items.map((it) => (
            <button type="button" class={itemCls} data-theme-mode={it.m} onClick={() => choose(it.m)}>
              <span class="inline-flex w-4 justify-center">
                {() => mode.value === it.m ? <IconCheck size="xs" /> : null}
              </span>
              {it.label}
            </button>
          ))}
        </div>
      }
    >
      <span class={triggerCls} data-testid="theme-menu" title={tr("topbar.theme")} aria-label={tr("topbar.theme")}>
        <IconMoon size="sm" class="dark:hidden" />
        <IconSun size="sm" class="hidden dark:inline-block" />
      </span>
    </Dropdown>
  );
}
