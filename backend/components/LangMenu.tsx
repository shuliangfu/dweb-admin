/**
 * Language: one icon, dropdown 简体中文 / English.
 * Kept on the locale-cookie approach (GET /api/i18n/locale sets the cookie, redirects back):
 * the server resolves cookie > Accept-Language on every SSR request, so no hydration mismatch.
 */
import { Dropdown, IconCheck, IconGlobe } from "@dreamer/ui-view";
import { LOCALE_LABELS, LOCALES, type Locale } from "@common/i18n/mod.ts";
import { itemCls, triggerCls } from "@backend/components/menu-kit.tsx";

function pick(lang: Locale): void {
  const loc = (globalThis as { location?: { pathname: string; search: string; href: string } }).location;
  if (!loc) return;
  const redirect = encodeURIComponent(loc.pathname + loc.search);
  loc.href = `/api/i18n/locale?lang=${lang}&redirect=${redirect}`;
}

export function LangMenu(props: { locale: Locale }) {
  return (
    <Dropdown
      placement="bottomAuto"
      overlay={
        <div data-testid="lang-options">
          {LOCALES.map((l) => (
            <button type="button" class={itemCls} data-lang={l} onClick={() => pick(l)}>
              <span class="inline-flex w-4 justify-center">{l === props.locale ? <IconCheck size="xs" /> : null}</span>
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      }
    >
      <span class={triggerCls} data-testid="lang-menu" aria-label="Language" title="Language">
        <IconGlobe size="xs" />
      </span>
    </Dropdown>
  );
}
