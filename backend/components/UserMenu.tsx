/**
 * Avatar dropdown. Trigger = one user icon (no name, no arrow). Panel, top to bottom:
 * name + role (display only) · Update profile · Security settings · Log out.
 */
import { Dropdown, IconLock, IconLogOut, IconShield, IconUser, IconUserCog } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { closeMenus, itemCls } from "@backend/components/menu-kit.tsx";
import { api } from "@common/utils/client-api.ts";
import { securityOpen } from "@backend/components/SecurityModal.tsx";
import { profileOpen } from "@backend/components/ProfileModal.tsx";
import { lockNow } from "@backend/components/lock-kit.ts";

export function UserMenu(props: { locale: Locale; nickname: string; roles: string[] }) {
  const tr = createT(props.locale);
  return (
    <Dropdown
      placement="bottomAuto"
      overlay={
        <div data-testid="user-options">
          <div class="min-w-42.5 border-b border-slate-200 px-3 py-2 text-center dark:border-slate-600" data-testid="user-header">
            <div class="truncate text-sm font-medium text-slate-800 dark:text-slate-100" data-testid="user-header-name">
              {props.nickname}
            </div>
            <div class="truncate text-xs text-slate-500 dark:text-slate-400" data-testid="user-header-role">
              {props.roles.join(", ")}
            </div>
          </div>
          <div class="pt-1">
            <button
              type="button"
              class={itemCls}
              data-testid="open-profile"
              onClick={() => {
                closeMenus();
                profileOpen.value = true;
              }}
            >
              <IconUserCog size="xs" />
              {tr("topbar.profile")}
            </button>
            <button
              type="button"
              class={itemCls}
              data-testid="open-security"
              onClick={() => {
                closeMenus();
                securityOpen.value = true;
              }}
            >
              <IconShield size="xs" />
              {tr("topbar.security")}
            </button>
            <button
              type="button"
              class={itemCls}
              data-testid="lock-screen"
              onClick={() => {
                closeMenus();
                lockNow();
              }}
            >
              <IconLock size="xs" />
              {tr("shell.lock")}
            </button>
            <button
              type="button"
              class={itemCls}
              data-testid="logout"
              onClick={async () => {
                await api("POST", "/api/auth/logout");
                (globalThis as unknown as { location: { href: string } }).location.href = "/login";
              }}
            >
              <IconLogOut size="xs" />
              {tr("nav.logout")}
            </button>
          </div>
        </div>
      }
    >
      <span
        class="inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-200 dark:hover:bg-slate-700"
        data-testid="user-menu"
        title={props.nickname}
      >
        <IconUser size="xs" />
      </span>
    </Dropdown>
  );
}
