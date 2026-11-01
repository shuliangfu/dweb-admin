/**
 * Theme switch: light / dark / follow system.
 * Options match senvis backend themePlugin + ThemeToggle.
 * Cookie key stays dweb-admin-theme (themePlugin cookieName = client storageKey).
 */
import { createSignal, onMount } from "@dreamer/view";
import { getTheme, type ThemeMode, type ThemeOptions } from "@dreamer/theme";
import { Dropdown, IconCircleSplit, IconMoon, IconSun } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import {
  closeMenus,
  itemCls,
  triggerCls,
} from "@backend/components/menu-kit.tsx";

export const THEME_KEY = "dweb-admin-theme";

const clientOptions: ThemeOptions = {
  defaultMode: "system",
  strategy: "class",
  darkClass: "dark",
  attribute: "data-theme",
  selector: "html",
  storageKey: THEME_KEY,
  storageType: "cookie",
  cookieExpireDays: 365,
  disableTransition: false,
  transitionDuration: 200,
};

const mode = createSignal<ThemeMode>("system");

/** SSR document stubs exist but have no cookie string; Theme.getCookie splits it. */
function hasCookie(): boolean {
  const doc = (globalThis as { document?: { cookie?: unknown } }).document;
  return typeof doc?.cookie === "string";
}

function sync(): void {
  if (hasCookie()) mode.value = getTheme(clientOptions).getMode();
}

function choose(m: ThemeMode): void {
  if (!hasCookie()) return;
  getTheme(clientOptions).setMode(m);
  mode.value = m;
  closeMenus();
}

const MENU: Array<
  {
    m: ThemeMode;
    labelKey: "topbar.light" | "topbar.dark" | "topbar.system";
    Icon: typeof IconSun;
  }
> = [
  { m: "light", labelKey: "topbar.light", Icon: IconSun },
  { m: "dark", labelKey: "topbar.dark", Icon: IconMoon },
  { m: "system", labelKey: "topbar.system", Icon: IconCircleSplit },
];

export function ThemeMenu(props: { locale: Locale; compact?: boolean }) {
  const tr = createT(props.locale);
  onMount(sync);
  return (
    <Dropdown
      placement="bottomAuto"
      onOpenChange={(open: boolean) => {
        if (open) sync();
      }}
      overlay={
        <div data-testid="theme-options">
          {MENU.map((it) => {
            const ItemIcon = it.Icon;
            return (
              <button
                type="button"
                class={() =>
                  mode.value === it.m
                    ? `${itemCls} bg-primary-500/15 text-primary-700 dark:text-primary-300`
                    : itemCls}
                data-theme-mode={it.m}
                onClick={() => choose(it.m)}
              >
                <ItemIcon size="xs" />
                {tr(it.labelKey)}
              </button>
            );
          })}
        </div>
      }
    >
      <span
        class={triggerCls}
        data-testid="theme-menu"
        title={tr("topbar.theme")}
        aria-label={tr("topbar.theme")}
      >
        {() => {
          if (mode.value === "dark") return <IconMoon size="xs" />;
          if (mode.value === "system") return <IconCircleSplit size="xs" />;
          return <IconSun size="xs" />;
        }}
      </span>
    </Dropdown>
  );
}
