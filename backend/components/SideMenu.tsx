/**
 * Left sidebar. Tree from DB (common/service/menu.ts), RBAC-filtered + localized.
 * Aligns with Vue Side/Item: icon + title, collapse centers icon, unique-opened groups,
 * mobile click closes drawer. Top-level icons resolve via icon field or ICON_BY_KEY (size xs).
 * Second-level items always use the star icon (size sm, CSS shrinks further).
 */
import { Link, IconBookOpen, IconChevronRight, IconClock, IconCompass, IconDatabase, IconFileText, IconFolder, IconGlobe, IconGrid, IconHome, IconImage, IconKey, IconLayers, IconList, IconLock, IconMenu, IconMessageSquare, IconNewspaper, IconPalette, IconServer, IconSettings, IconShield, IconShieldCheck, IconSlidersHorizontal, IconStar, IconUserCog, IconUsers } from "@dreamer/ui-view";

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
  clock: IconClock,
  compass: IconCompass,
  globe: IconGlobe,
  image: IconImage,
  newspaper: IconNewspaper,
  server: IconServer,
  folder: IconFolder,
  layers: IconLayers,
  palette: IconPalette,
  message: IconMessageSquare,
  file: IconFileText,
  filetext: IconFileText,
};

/** Top-level groups only. Second-level items always render IconStar. */
const ICON_BY_KEY: Record<string, string> = {
  dashboard: "home",
  workspace: "grid",
  rbac: "shield",
  system: "settings",
  user: "users",
  cms: "book",
  developer: "database",
};

function resolveIconName(node: MenuNode): string {
  const raw = (node.icon || "").trim().toLowerCase();
  if (raw && raw !== "star" && ICONS[raw]) return raw;
  const byKey = ICON_BY_KEY[node.key];
  if (byKey && ICONS[byKey]) return byKey;
  return (raw && ICONS[raw] ? raw : "") || "menu";
}

function Icon(props: { name: string; size?: "xs" | "sm" }) {
  const C = ICONS[props.name] ?? IconMenu;
  return <C size={props.size ?? "sm"} class="adm-menu-icon shrink-0" />;
}

function isActive(pathname: string, path: string): boolean {
  if (!path) return false;
  return path === "/"
    ? pathname === "/"
    : pathname === path || pathname.startsWith(path + "/");
}

function onNavClick(): void {
  closeDrawer();
}

/** Vue el-menu unique-opened: opening one group closes siblings. */
function onGroupToggle(e: Event): void {
  const el = e.currentTarget as unknown as {
    open?: boolean;
    closest?: (
      s: string,
    ) => { querySelectorAll: (s: string) => { open: boolean }[] } | null;
  };
  if (!el?.open || !el.closest) return;
  const nav = el.closest("nav.adm-menu");
  if (!nav) return;
  for (
    const d of nav.querySelectorAll("details.adm-menu-group") as unknown as {
      open: boolean;
    }[]
  ) {
    if (d !== el) d.open = false;
  }
}

const topBase =
  "adm-top-item flex w-full min-w-0 items-center gap-2.5 px-4 text-sm no-underline transition-colors";
const subBase =
  "adm-sub-item flex w-full min-w-0 items-center gap-2 pl-9 pr-3 text-menu no-underline transition-colors";

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
                  class={`${topBase} ${
                    isActive(props.pathname, node.path) ? "adm-on" : ""
                  }`}
                  onClick={onNavClick}
                >
                  <Icon name={iconName} size="xs" />
                  <span class="adm-label truncate">{node.title}</span>
                </Link>
              </li>
            );
          }
          const open = node.children.some((c) =>
            isActive(props.pathname, c.path)
          );
          return (
            <li key={node.key}>
              <details
                class="adm-menu-group group/nav"
                {...(open ? { open: true } : {})}
                onToggle={onGroupToggle}
              >
                <summary
                  class={`${topBase} cursor-pointer list-none select-none`}
                  title={node.title}
                >
                  <Icon name={iconName} size="xs" />
                  <span class="adm-label min-w-0 flex-1 truncate">
                    {node.title}
                  </span>
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
                        class={`${subBase} ${
                          isActive(props.pathname, child.path) ? "adm-on" : ""
                        }`}
                        onClick={onNavClick}
                      >
                        <Icon name="star" size="sm" />
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
