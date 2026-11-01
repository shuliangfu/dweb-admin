/**
 * Top chrome row — Vue Layout/TopHeader:
 * collapse + breadcrumb | user / chat / lang / theme / fullscreen / settings.
 */
import { Breadcrumb, IconMessageCircle, IconSettings } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import type { MenuNode } from "@common/service/menu.ts";
import { buildBreadcrumb } from "@backend/components/breadcrumb.ts";
import { SidebarToggle } from "@backend/components/SidebarToggle.tsx";
import { LangMenu } from "@backend/components/LangMenu.tsx";
import { ThemeMenu } from "@backend/components/ThemeMenu.tsx";
import { UserMenu } from "@backend/components/UserMenu.tsx";
import { FullscreenToggle } from "@backend/components/FullscreenToggle.tsx";
import { chatOpen } from "@backend/components/ChatModal.tsx";
import { breadcrumbOn, settingsOpen } from "@backend/components/SettingsDrawer.tsx";
import { triggerCls } from "@backend/components/menu-kit.tsx";

export function TopHeader(props: {
  locale: Locale;
  pathname: string;
  menu: MenuNode[];
  nickname: string;
  roles: string[];
}) {
  const tr = createT(props.locale);
  const crumbs = buildBreadcrumb(props.menu, props.pathname);

  return (
    <header
      class="adm-top-header flex h-14 shrink-0 items-center justify-between gap-3 px-4"
      data-testid="top-header"
    >
      <div class="flex min-w-0 items-center gap-2">
        <SidebarToggle label={tr("shell.toggleSidebar")} />
        {() =>
          breadcrumbOn.value && crumbs.length > 0
            ? (
              <Breadcrumb
                class="adm-crumb hidden min-w-0 sm:flex"
                items={crumbs}
                separator={<span class="mx-1.5 opacity-50">/</span>}
              />
            )
            : null}
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        <UserMenu locale={props.locale} nickname={props.nickname} roles={props.roles} />
        <button
          type="button"
          class={triggerCls}
          data-testid="chat-toggle"
          title={tr("shell.chatTitle")}
          aria-label={tr("shell.chatTitle")}
          onClick={() => {
            chatOpen.value = true;
          }}
        >
          <IconMessageCircle size="sm" />
        </button>
        <LangMenu locale={props.locale} />
        <ThemeMenu locale={props.locale} />
        <FullscreenToggle
          enterLabel={tr("shell.fullscreen")}
          exitLabel={tr("shell.exitFullscreen")}
        />
        <button
          type="button"
          class={triggerCls}
          data-testid="settings-toggle"
          title={tr("shell.settingsTitle")}
          aria-label={tr("shell.settingsTitle")}
          onClick={() => {
            settingsOpen.value = true;
          }}
        >
          <IconSettings size="sm" />
        </button>
      </div>
    </header>
  );
}
