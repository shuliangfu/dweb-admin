/**
 * Hamburger button.
 *  - desktop (>= 768px): collapses the sidebar to an icon rail; the state is stored in the cookie
 *    `dweb-admin-sidebar` (1 = collapsed) which the layout reads during SSR, so there is no flash.
 *  - mobile: opens / closes the sidebar as a drawer (class `adm-drawer-open`).
 */
import { IconMenu } from "@dreamer/ui-view";

export const SIDEBAR_COOKIE = "dweb-admin-sidebar";

// deno-lint-ignore no-explicit-any
const g = (): any => globalThis as any;

const shell = () => g().document?.querySelector(".adm-shell");
const isDesktop = () => !!g().matchMedia?.("(min-width: 768px)").matches;

function toggle(): void {
  const el = shell();
  if (!el) return;
  if (isDesktop()) {
    const on = el.classList.toggle("adm-collapsed");
    g().document.cookie = `${SIDEBAR_COOKIE}=${on ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } else {
    el.classList.toggle("adm-drawer-open");
  }
}

/** Backdrop click (mobile). */
export function closeDrawer(): void {
  shell()?.classList.remove("adm-drawer-open");
}

export function SidebarToggle(props: { label: string }) {
  return (
    <button
      type="button"
      data-testid="sidebar-toggle"
      title={props.label}
      aria-label={props.label}
      onClick={toggle}
      class="inline-flex items-center rounded px-2 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <IconMenu size="xs" />
    </button>
  );
}
