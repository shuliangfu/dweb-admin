/**
 * Admin shell aligned to Vue Layout.vue IA:
 *   aside (logo + menu) | column( TopHeader → TagView → main )
 * Auth is enforced by middleware (backend/rbac-guard.ts); load() gathers chrome data.
 * Login / lock render without chrome.
 */

import type { VNode } from "@dreamer/view";
import type { LoadContext } from "@dreamer/dweb";
import { MessageContainer, ToastContainer } from "@dreamer/ui-view";
import { createT, type Locale, resolveLocale } from "@common/i18n/mod.ts";
import type { MenuNode } from "@common/service/menu.ts";
import { SideMenu } from "@backend/components/SideMenu.tsx";
import { SideBrand } from "@backend/components/SideBrand.tsx";
import { TopHeader } from "@backend/components/TopHeader.tsx";
import { TagView } from "@backend/components/TagView.tsx";
import { SecurityModal } from "@backend/components/SecurityModal.tsx";
import { ProfileModal } from "@backend/components/ProfileModal.tsx";
import { ChatModal } from "@backend/components/ChatModal.tsx";
import { SettingsDrawer } from "@backend/components/SettingsDrawer.tsx";
import { closeDrawer } from "@backend/components/SidebarToggle.tsx";
import { resolvePageTitle } from "@backend/components/breadcrumb.ts";
import { isLockedRequest } from "@backend/components/lock-kit.ts";

interface LayoutData {
  isLoginPage?: boolean;
  isLockPage?: boolean;
  pathname?: string;
  locale?: Locale;
  user?: { username: string; nickname: string; roleCodes: string[] } | null;
  menu?: MenuNode[];
  /** Sidebar collapsed (cookie dweb-admin-sidebar=1), applied during SSR. */
  collapsed?: boolean;
}

export async function load(ctx: LoadContext): Promise<LayoutData | Response> {
  const pathname = ctx.pathname || "/";
  const locale = resolveLocale(ctx.req);
  if (pathname.startsWith("/api/")) return {};
  if (
    pathname === "/login" ||
    pathname.startsWith("/password/") ||
    pathname.startsWith("/error/")
  ) {
    return { isLoginPage: true, pathname, locale };
  }

  const { getCurrentUser } = await import("@common/service/auth.ts");
  const { buildMenuTree } = await import("@common/service/menu.ts");
  const user = await getCurrentUser(ctx.req);
  if (!user) {
    return ctx.res
      ? ctx.res.redirect("/login") as unknown as LayoutData
      : new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  const locked = isLockedRequest(ctx.req.headers.get("cookie"));
  if (pathname === "/lock") {
    return {
      isLockPage: true,
      pathname,
      locale,
      user: { username: user.username, nickname: user.nickname, roleCodes: user.roleCodes },
    };
  }
  if (locked) {
    return new Response(null, { status: 302, headers: { Location: "/lock" } });
  }

  return {
    pathname,
    locale,
    user: { username: user.username, nickname: user.nickname, roleCodes: user.roleCodes },
    menu: await buildMenuTree(user.roleCodes, locale),
    collapsed: /(?:^|;\s*)dweb-admin-sidebar=1/.test(ctx.req.headers.get("cookie") ?? ""),
  };
}

export default function Layout(props: { children?: VNode | VNode[]; data?: LayoutData }) {
  const data = props.data ?? {};
  if (data.isLoginPage || data.isLockPage) return <>{props.children}</>;
  const locale = data.locale ?? "zh-CN";
  const tr = createT(locale);
  const pathname = data.pathname ?? "/";
  const menu = data.menu ?? [];
  const pageTitle = resolvePageTitle(menu, pathname, tr("nav.dashboard"));

  return (
    <div class={`adm-shell flex h-screen overflow-hidden${data.collapsed ? " adm-collapsed" : ""}`}>
      <div class="adm-backdrop" onClick={closeDrawer} />
      <aside class="adm-side flex shrink-0 flex-col overflow-hidden">
        <SideBrand name={tr("app.name")} short={tr("app.short")} />
        <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <SideMenu tree={menu} pathname={pathname} />
        </div>
      </aside>
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeader
          locale={locale}
          pathname={pathname}
          menu={menu}
          nickname={data.user?.nickname ?? ""}
          roles={data.user?.roleCodes ?? []}
        />
        <TagView
          pathname={pathname}
          title={pageTitle}
          dashboardTitle={tr("nav.dashboard")}
          labels={{
            closeLeft: tr("shell.closeLeft"),
            closeRight: tr("shell.closeRight"),
            closeOther: tr("shell.closeOther"),
            closeAll: tr("shell.closeAll"),
          }}
        />
        <main class="adm-content min-h-0 min-w-0 flex-1 overflow-y-auto p-3 md:p-4">
          <div class="rounded-sm border-t-[3px] border-[#3c8dbc] bg-white p-5 shadow-sm dark:bg-slate-800">
            {props.children}
          </div>
        </main>
      </div>
      <SecurityModal locale={locale} />
      <ProfileModal locale={locale} />
      <ChatModal locale={locale} />
      <SettingsDrawer locale={locale} />
      <ToastContainer />
      <MessageContainer />
    </div>
  );
}
