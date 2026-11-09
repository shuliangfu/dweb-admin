/**
 * Sidebar menu tree (two levels) read from the `menus` collection,
 * filtered by the user's RBAC (a leaf is visible when the role may GET its path).
 */
import { Menu, type MenuDocument } from "@common/model/mod.ts";
import { type Locale, pickLocalized } from "@common/i18n/mod.ts";
import { canAccess, hasPermission } from "@common/service/rbac.ts";

export interface MenuNode {
  key: string;
  title: string;
  path: string;
  icon: string;
  children: MenuNode[];
}

/** All active menus ordered by `sort` then key. */
export async function listMenus(): Promise<MenuDocument[]> {
  const rows = (await Menu.findAll({ status: "active" }, undefined, {
    sort: { sort: 1 },
  })) as unknown as MenuDocument[];
  return rows.sort((a, b) => (a.sort - b.sort) || a.key.localeCompare(b.key));
}

/** Build the localized two-level tree visible to `roleCodes`. */
export async function buildMenuTree(
  roleCodes: string[],
  locale: Locale,
): Promise<MenuNode[]> {
  const rows = await listMenus();
  const toNode = (m: MenuDocument): MenuNode => ({
    key: m.key,
    title: pickLocalized(m.title, locale, m.key),
    path: m.path,
    icon: m.icon,
    children: [],
  });
  // path → GET route grant; optional permission → named hasPermission (AND).
  const visible = async (m: MenuDocument) => {
    if (m.path && !await canAccess(roleCodes, "GET", m.path)) return false;
    if (m.permission && !await hasPermission(roleCodes, m.permission)) return false;
    // Group nodes (no path): visible when any child remains after filter.
    return true;
  };

  const tops = rows.filter((m) => !m.parentKey);
  const tree: MenuNode[] = [];
  for (const top of tops) {
    const node = toNode(top);
    // Only two levels: children of a top-level item; deeper nesting is ignored.
    for (const child of rows.filter((m) => m.parentKey === top.key)) {
      if (child.path && await visible(child)) node.children.push(toNode(child));
    }
    if (node.path) {
      if (await visible(top)) tree.push(node);
    } else if (node.children.length > 0) {
      tree.push(node);
    }
  }
  return tree;
}
