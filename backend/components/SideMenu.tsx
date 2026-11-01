/**
 * Left sidebar. Tree from DB (common/service/menu.ts), RBAC-filtered + localized.
 * Aligns with Vue Side/Item: icon + title, collapse centers icon, mobile click closes drawer.
 */
import {
  IconBookOpen,
  IconChevronRight,
  IconDatabase,
  IconGrid,
  IconHome,
  IconKey,
  IconList,
  IconLock,
  IconMenu,
  IconSettings,
  IconShield,
  IconShieldCheck,
  IconSlidersHorizontal,
  IconStar,
  IconUserCog,
  IconUsers,
  Link,
} from "@dreamer/ui-view";
import type { MenuNode } from "@common/service/menu.ts";
import { closeDrawer } from "@backend/components/SidebarToggle.tsx";

type IconComp = typeof IconHome;

const ICONS: Record<string, IconComp> = {
  home: IconHome,
  users: IconUsers,
  user: IconUsers,
  usercog: IconUserCog,
  settings: IconSettings,
  setting: IconSettings,
  shield: IconShield,
  shieldcheck: IconShieldCheck,
  menu: IconMenu,
  star: IconStar,
  lock: IconLock,
  key: IconKey,
  grid: IconGrid,
  list: IconList,
  database: IconDatabase,
  book: IconBookOpen,
  sliders: IconSlidersHorizontal,
};

/** When seed still says "star", pick a sensible icon from the menu key. */
const ICON_BY_KEY: Record<string, string> = {
  "dashboard": "home",
  "workspace": "grid",
  "rbac": "shield",
  "rbac.admins": "users",
  "rbac.roles": "shieldcheck",
  "rbac.permissions": "key",
  "rbac.routes": "list",
  "system": "settings",
  "system.menus": "menu",
  "system.online": "users",
  "user": "users",
  "cms": "book",
  "finance": "sliders",
  "count": "list",
  "developer": "database",
  "system.admin-log": "list",
  "system.express": "list",
  "system.level": "star",
  "system.locale": "book",
  "system.region": "grid",
  "system.base": "sliders",
  "system.bonus": "star",
  "system.datetime": "sliders",
  "system.finance": "sliders",
  "system.transfer": "sliders",
  "system.wallet": "sliders",
  "user.index": "users",
  "user.new": "users",
  "user.active": "users",
  "user.black": "users",
  "user.locked": "users",
  "user.zombie": "users",
  "user.online": "users",
  "user.log": "list",
  "user.receipt": "list",
  "user.upgrade-log": "list",
  "user.location": "grid",
  "user.path-invite": "grid",
  "user.path-position": "grid",
  "cms.article": "book",
  "cms.news": "book",
  "cms.notice": "book",
  "cms.photo": "book",
  "cms.qa": "book",
  "cms.survey": "book",
  "finance.bonus": "star",
  "finance.bonus-log": "list",
  "finance.invest": "list",
  "finance.point": "list",
  "finance.recharge": "list",
  "finance.wallet": "list",
  "finance.wallet-add-sub": "sliders",
  "finance.wallet-log": "list",
  "finance.withdraw": "list",
  "count.bonus": "list",
  "count.invest": "list",
  "count.point": "list",
  "count.recharge": "list",
  "count.withdraw": "list",
  "developer.database": "database",
  "developer.feedback": "list",
  "developer.language": "book",
  "developer.system": "list",
};

function resolveIconName(node: MenuNode): string {
  const raw = (node.icon || "").trim().toLowerCase();
  if (raw && raw !== "star" && ICONS[raw]) return raw;
  return ICON_BY_KEY[node.key] ?? (raw || "menu");
}

function Icon(props: { name: string }) {
  const C = ICONS[props.name] ?? IconMenu;
  return <C size="sm" class="adm-menu-icon shrink-0" />;
}

function isActive(pathname: string, path: string): boolean {
  if (!path) return false;
  return path === "/"
    ? pathname === "/"
    : pathname === path || pathname.startsWith(path + "/");
}

function onNavClick(): void {
  // Vue Item closes the mobile drawer after a menu click.
  closeDrawer();
}

const topBase =
  "adm-top-item flex w-full min-w-0 items-center gap-2.5 px-4 py-3 text-sm no-underline transition-colors";
const subBase =
  "adm-sub-item flex w-full min-w-0 items-center gap-2 py-2 pl-9 pr-3 text-[13px] no-underline transition-colors";

export function SideMenu(props: { tree: MenuNode[]; pathname: string }) {
  return (
    <nav class="adm-menu dweb-side-menu" aria-label="Main">
      <ul class="m-0 list-none p-0">
        {props.tree.map((node) => {
          const iconName = resolveIconName(node);
          if (node.children.length === 0) {
            return (
              <li key={node.key}>
                <Link
                  href={node.path}
                  title={node.title}
                  class={`${topBase} ${isActive(props.pathname, node.path) ? "adm-on" : ""}`}
                  onClick={onNavClick}
                >
                  <Icon name={iconName} />
                  <span class="adm-label truncate">{node.title}</span>
                </Link>
              </li>
            );
          }
          const open = node.children.some((c) => isActive(props.pathname, c.path));
          return (
            <li key={node.key}>
              <details class="group/nav" open={open}>
                <summary
                  class={`${topBase} cursor-pointer list-none select-none`}
                  title={node.title}
                >
                  <Icon name={iconName} />
                  <span class="adm-label min-w-0 flex-1 truncate">{node.title}</span>
                  <IconChevronRight
                    size="xs"
                    class="adm-label adm-chevron shrink-0 opacity-70 transition-transform group-open/nav:rotate-90"
                  />
                </summary>
                <ul class="adm-sublist m-0 list-none p-0 pb-1">
                  {node.children.map((child) => (
                    <li key={child.key}>
                      <Link
                        href={child.path}
                        title={child.title}
                        class={`${subBase} ${isActive(props.pathname, child.path) ? "adm-on" : ""}`}
                        onClick={onNavClick}
                      >
                        <Icon name={resolveIconName(child)} />
                        <span class="truncate">{child.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
